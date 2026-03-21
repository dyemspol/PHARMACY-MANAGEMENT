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
      lineFeed: new Uint8Array([0x0a]),
    };
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
      throw error;
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
    text('DavaoDeOro\n');
    add(this.commands.boldOff);
    text('Pharmacy Management\n');
    text('--------------------------------\n');
    
    add(this.commands.alignLeft);
    text(`Date: ${new Date().toLocaleString()}\n`);
    text(`TRX ID: ${receiptData.transactionId || 'N/A'}\n`);
    text('--------------------------------\n');
    
    add(this.commands.boldOn);
    text('Item             Qty      Total\n');
    add(this.commands.boldOff);
    
    receiptData.items.forEach(item => {
      const name = item.name.substring(0, 15).padEnd(16);
      const qty = item.quantity.toString().padEnd(8);
      const total = 'P' + (item.price * item.quantity).toFixed(2);
      text(`${name} ${qty} ${total}\n`);
    });
    
    text('--------------------------------\n');
    add(this.commands.alignRight);
    text(`Subtotal: P${receiptData.subtotal.toFixed(2)}\n`);
    if (receiptData.discount > 0) {
      text(`Discount: -P${receiptData.discount.toFixed(2)}\n`);
    }
    add(this.commands.boldOn);
    text(`NET TOTAL: P${receiptData.total.toFixed(2)}\n`);
    add(this.commands.boldOff);
    
    text(`Cash: P${receiptData.cash.toFixed(2)}\n`);
    text(`Change: P${receiptData.change.toFixed(2)}\n`);
    
    add(this.commands.lineFeed);
    add(this.commands.alignCenter);
    text('Thank you for choosing us!\n');
    text('Stay Healthy!\n');
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
    add(this.commands.lineFeed);
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
    text('PRINTER TEST PAGE\n');
    add(this.commands.boldOff);
    text('DavaoDeOro Pharmacy\n');
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
    add(this.commands.feedAndCut);

    return await this.print(new Uint8Array(buffer));
  }
}

export const printerService = new PrinterService();
