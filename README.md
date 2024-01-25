### Overview

*AuthGuard-Bot* is a Node.js and Express-based API designed for streamlined OTP verification, ensuring the authenticity of entered phone numbers. This simplified setup allows users to quickly host the API, generate a QR code for scanning, and start testing the API.

### Quick Start

1. **Clone the Repository:**
```bash
git clone https://github.com/AliAryanTech/AuthGuard-Bot.git
```

2. **Navigate to the Project Directory:**
```bash
cd AuthGuard-Bot
```

3. **Install Dependencies:**
```bash
npm install
```

4. **Start the API Server and Get QR Code:**
```bash
npm run start
```

This will start the server and display a QR code in the terminal.

5. **Scan the QR Code:**
- Use a QR code scanner on your phone to scan the displayed code.
- This links your phone as a host for OTP verification.

6. **Testing the API:**
- Use your hosted domain like:
- Send OTP: `http://localhost:3000/request?phone=+1234567890`
- Verify OTP: `http://localhost:3000/verify?phone=+1234567890&code=123456`

7. **Additional Step for Cloud Hosting:**
- Enter the session password (default is 123) in the `app.js` file.
- Visit `http://localhost:3000/wa/qr?session=123` to generate a new QR code.

### Notes
- The server is now ready for OTP verification after the QR code is scanned.
- If you scanned the QR code from the terminal, you don't need to perform the additional step.
- Customize and configure the API endpoints as needed in the `app.js` file.

### Contribution
Contributions are welcome! Feel free to submit issues or pull requests.

### License
This project is licensed under the [MIT License](LICENSE).
