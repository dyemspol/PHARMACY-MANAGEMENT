/**
 * PrinterService handles Bluetooth ESC/POS thermal printer communication.
 */
class PrinterService {
  constructor() {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.encoder = new TextEncoder();
    
    // Common ESC/POS Commands
    this.commands = {
      init: new Uint8Array([0x1b, 0x40]),
      boldOn: new Uint8Array([0x1b, 0x45, 0x01]),
      boldOff: new Uint8Array([0x1b, 0x45, 0x00]),
      alignLeft: new Uint8Array([0x1b, 0x61, 0x00]),
      alignCenter: new Uint8Array([0x1b, 0x61, 0x01]),
      alignRight: new Uint8Array([0x1b, 0x61, 0x02]),
      underlineOn: new Uint8Array([0x1b, 0x2d, 0x01]),
      underlineOff: new Uint8Array([0x1b, 0x2d, 0x00]),
      feedAndCut: new Uint8Array([0x1d, 0x56, 0x41, 0x03]),
      partialCut: new Uint8Array([0x1d, 0x56, 0x01]),
      lineFeed: new Uint8Array([0x0a]),
    };

    this.onStatusChange = null;
  }

  isConnected() {
    return !!this.characteristic;
  }

  async connect() {
    try {
      if (!navigator.bluetooth) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          throw new Error('Web Bluetooth is NOT supported on iOS (iPhone/iPad). Please use an Android device, a Laptop, or the "Bluefy" browser on iOS.');
        } else {
          throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
        }
      }

      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Generic
          'e8e10002-4f24-4a21-82c9-ffff9c4909a3', // Some Epson/Generic
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // IS SC
        ]
      });

      console.log('Connecting to GATT Server...');
      this.server = await this.device.gatt.connect();

      // Look for any supported service/characteristic
      const services = await this.server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        // Look for a writeable characteristic
        const writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
        if (writeChar) {
          this.characteristic = writeChar;
          console.log('Connected to characteristic:', writeChar.uuid);
          if (this.onStatusChange) this.onStatusChange('ready');
          break;
        }
      }

      if (!this.characteristic) {
        throw new Error('Could not find a writeable characteristic on the printer.');
      }

      // Save device info to localStorage
      localStorage.setItem('bluetoothDevice', this.device.name || this.device.id);
      localStorage.setItem('bluetoothDeviceId', this.device.id);

      return this.device;
    } catch (error) {
      console.error('Bluetooth Connection Error:', error);
      if (this.onStatusChange) this.onStatusChange('disconnected');
      throw error;
    }
  }

  async reconnect() {
    try {
      if (!navigator.bluetooth || !navigator.bluetooth.getDevices) {
        console.warn('getDevices() not supported');
        return false;
      }

      const devices = await navigator.bluetooth.getDevices();
      const savedId = localStorage.getItem('bluetoothDeviceId');
      
      const device = devices.find(d => d.id === savedId);
      if (!device) return false;

      console.log('Attempting to reconnect to:', device.name || device.id);
      if (this.onStatusChange) this.onStatusChange('connecting');

      this.device = device;
      this.server = await this.device.gatt.connect();

      const services = await this.server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
        if (writeChar) {
          this.characteristic = writeChar;
          console.log('Successfully reconnected to printer characteristic');
          if (this.onStatusChange) this.onStatusChange('ready');
          return true;
        }
      }
      
      if (this.onStatusChange) this.onStatusChange('disconnected');
      return false;
    } catch (error) {
      console.error('Reconnection failed:', error);
      if (this.onStatusChange) this.onStatusChange('disconnected');
      return false;
    }
  }

  async print(data) {
    if (!this.characteristic) {
      // Try to reconnect if we have a device name but no active characteristic
      const deviceId = localStorage.getItem('bluetoothDeviceId');
      if (deviceId) {
        console.warn('Printer not connected. Please connect via settings first.');
        return false;
      }
      return false;
    }

    try {
      // Print in chunks to avoid buffer overflow (some printers have small buffers)
      const chunkSize = 20;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await this.characteristic.writeValue(chunk);
      }
      return true;
    } catch (error) {
      console.error('Printing failed:', error);
      localStorage.removeItem('bluetoothDeviceId'); // Clear so user knows to reconnect
      return false;
    }
  }

  async printReceipt(receiptData) {
    let buffer = [];
    
    const add = (arr) => buffer.push(...arr);
    const text = (str) => add(this.encoder.encode(str.replace(/₱/g, 'P'))); // Replace Peso sign with P for compatibility
    
    add(this.commands.init);
    add(this.commands.alignCenter);
    add(this.commands.boldOn);
    text('RIGHT MED\n');
    add(this.commands.boldOff);
    text('PHARMACY AND MEDICAL SUPPLY\n\n');
    text('Mendez Town Square, Townsite,\n');
    text('Kingking Pantukan, Davao de Oro\n\n');
    text('TEL# 084-817-0874\n\n');
    
    add(this.commands.alignLeft);
    const employee = receiptData.cashierName || 'Admin / Cashier';
    text(`Employee: ${employee}\n`);
    text('--------------------------------\n');
    
    receiptData.items.forEach(item => {
      // e.g. Hovicor cream 15gm          P450.00
      const name = item.name.substring(0, 22);
      const totalStr = 'P' + (item.price * item.quantity).toFixed(2);
      const spaces = Math.max(1, 32 - name.length - totalStr.length);
      text(`${name}${(' ').repeat(spaces)}${totalStr}\n`);
      
      // e.g. 2 x P225.00
      text(`${item.quantity} x P${item.price.toFixed(2)}\n`);
      text('\n');
    });
    
    text('--------------------------------\n');
    if (receiptData.discount > 0) {
      const discStr = `-P${receiptData.discount.toFixed(2)}`;
      const spacesDisc = Math.max(1, 32 - 14 - discStr.length);
      text(`Senior Citizen${(' ').repeat(spacesDisc)}${discStr}\n`);
      text('--------------------------------\n');
    }
    
    add(this.commands.boldOn);
    const totalStr = 'P' + receiptData.total.toFixed(2);
    const spacesTotal = Math.max(1, 32 - 5 - totalStr.length);
    text(`Total${(' ').repeat(spacesTotal)}${totalStr}\n\n`);
    add(this.commands.boldOff);
    
    const cashStr = 'P' + receiptData.cash.toFixed(2);
    const spacesCash = Math.max(1, 32 - 4 - cashStr.length);
    text(`Cash${(' ').repeat(spacesCash)}${cashStr}\n`);
    
    const changeStr = 'P' + receiptData.change.toFixed(2);
    const spacesChange = Math.max(1, 32 - 6 - changeStr.length);
    text(`Change${(' ').repeat(spacesChange)}${changeStr}\n`);
    
    text('--------------------------------\n');
    add(this.commands.alignCenter);
    text('TRANSACTION RECEIPT ONLY !!!\n\n\n');
    text('THANK YOU!!!\n\n');
    text(`${new Date().toLocaleString()}\n`);
    
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.partialCut);
    add(this.commands.feedAndCut);

    return await this.print(new Uint8Array(buffer));
  }

  async printShiftReport(reportData) {
    let buffer = [];
    const add = (arr) => buffer.push(...arr);
    const text = (str) => add(this.encoder.encode(str.replace(/₱/g, 'P')));

    add(this.commands.init);
    add(this.commands.alignCenter);
    add(this.commands.boldOn);
    text('Shift report\n\n');
    add(this.commands.boldOff);
    
    add(this.commands.alignLeft);
    text(`Shift number: ${reportData.shiftNumber || Math.floor(Math.random() * 900) + 100}\n`);
    text(`Store: RiGHT MEDS Pharmacy...\n`);
    text(`POS: ${reportData.posName.toUpperCase()}\n`);
    text('--------------------------------\n');
    
    text(`Shift opened: \n`);
    text(`Today         ${reportData.openedAt || 'N/A'}\n\n`);
    text(`Shift closed: \n`);
    text(`Today         ${new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}\n`);
    text('--------------------------------\n\n');

    add(this.commands.alignCenter);
    add(this.commands.boldOn);
    text('Cash drawer\n\n');
    add(this.commands.boldOff);
    add(this.commands.alignLeft);

    const formatLine = (label, value) => {
      const valStr = 'P' + parseFloat(value).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
      const spaces = Math.max(1, 32 - label.length - valStr.length);
      return `${label}${(' ').repeat(spaces)}${valStr}\n`;
    };

    text(formatLine('Starting cash', reportData.startingCash));
    text(formatLine('Cash payments', reportData.cashPayments));
    text(formatLine('Cash refunds', reportData.cashRefunds));
    text(formatLine('Paid in', 0));
    text(formatLine('Paid out', 0));
    text(formatLine('Expected cash', reportData.expectedCash));
    text(formatLine('Actual cash amount', reportData.actualCash));
    text(formatLine('Difference', reportData.actualCash - reportData.expectedCash));
    text('\n');

    text('--------------------------------\n\n');
    add(this.commands.alignCenter);
    add(this.commands.boldOn);
    text('Sales summary\n\n');
    add(this.commands.boldOff);
    add(this.commands.alignLeft);

    text(formatLine('Gross sales', reportData.grossSales));
    text(formatLine('Refunds', reportData.refunds));
    text(formatLine('Discounts', reportData.discounts));
    text(formatLine('Net sales', reportData.netSales));
    text(formatLine('Cash', reportData.cashPayments));
    text(formatLine('Taxes', 0));
    text('\n');

    text('--------------------------------\n');
    add(this.commands.alignCenter);
    text(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`);
    
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.partialCut);
    add(this.commands.feedAndCut);

    return await this.print(new Uint8Array(buffer));
  }

  async printTestPage() {
    let buffer = [];
    const add = (arr) => buffer.push(...arr);
    const text = (str) => add(this.encoder.encode(str));

    add(this.commands.init);
    add(this.commands.alignCenter);
    add(this.commands.boldOn);
    text('RIGHT MED\n');
    add(this.commands.boldOff);
    text('PHARMACY AND MEDICAL SUPPLY\n');
    text('--------------------------------\n');
    add(this.commands.alignLeft);
    text('Status: ONLINE\n');
    text('Interface: Bluetooth\n');
    text('Language: ESC/POS\n');
    text('--------------------------------\n');
    add(this.commands.alignCenter);
    text('1234567890\n');
    text('abcdefghij\n');
    text('!@#$%^&*()\n');
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.partialCut);
    add(this.commands.feedAndCut);

    return await this.print(new Uint8Array(buffer));
  }
}

export const printerService = new PrinterService();
