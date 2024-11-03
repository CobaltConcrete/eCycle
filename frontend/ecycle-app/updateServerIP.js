const fs = require('fs');
const os = require('os');

// Function to retrieve the server IP address for the Wi-Fi adapter
function getServerIP() {
    const interfaces = os.networkInterfaces();
    for (const iface in interfaces) {
        for (const details of interfaces[iface]) {
            // Check if the interface is the Wi-Fi adapter and is an IPv4 address that is not a loopback
            if (iface.includes('Wi-Fi') && details.family === 'IPv4' && !details.internal) {
                return details.address;  // Return the Wi-Fi adapter's IPv4 address
            }
        }
    }
    return null;  // Return null if no valid address is found
}

// Function to update the .env file
function updateEnvFile(serverIP) {
    const envFilePath = './.env';
    fs.readFile(envFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading .env file:', err);
            return;
        }

        // Update the REACT_APP_serverIP variable
        const updatedData = data.replace(/REACT_APP_serverIP=.*/g, `REACT_APP_serverIP=${serverIP}`);
        fs.writeFile(envFilePath, updatedData, 'utf8', (err) => {
            if (err) {
                console.error('Error writing to .env file:', err);
            } else {
                console.log(`Updated REACT_APP_serverIP to ${serverIP} in .env file.`);
            }
        });
    });
}

// Main execution
const serverIP = getServerIP();
if (serverIP) {
    updateEnvFile(serverIP);
} else {
    console.error('Could not retrieve server IP address.');
}
