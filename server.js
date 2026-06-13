const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// -----------------------------
// DATABASE
// -----------------------------
const dataFile = "data.json";

let passengers = fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile))
    : {
        "1001": { name: "DIBA", balance: 200 },
        "1002": { name: "MATAZA", balance: 80 },
        "1003": { name: "RASHID", balance: 30 }
    };

// -----------------------------
// FLEET
// -----------------------------
let matatus = {
    "MAT001": { revenue: 0 },
    "MAT002": { revenue: 0 }
};

// -----------------------------
// SYSTEM SETTINGS
// -----------------------------
let fare = 50;

// -----------------------------
// AUTH SYSTEMS
// -----------------------------
let isAdminLoggedIn = false;
let driverLoggedIn = false;

const ADMIN = { username: "admin", password: "1234" };
const DRIVER_PASSWORD = "driver123";

// -----------------------------
// SAVE DATA
// -----------------------------
function saveData() {
    fs.writeFileSync(dataFile, JSON.stringify(passengers, null, 2));
}

// -----------------------------
// ADMIN LOGIN
// -----------------------------
app.get("/login", (req, res) => {
    res.send(`
        <h2>🔐 ADMIN LOGIN</h2>
        <form method="POST" action="/login">
            <input name="username" placeholder="Username" required />
            <br><br>
            <input name="password" type="password" placeholder="Password" required />
            <br><br>
            <button>Login</button>
        </form>
    `);
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN.username && password === ADMIN.password) {
        isAdminLoggedIn = true;
        return res.redirect("/");
    }

    res.send("❌ Invalid admin login");
});

// -----------------------------
// DRIVER LOGIN PAGE
// -----------------------------
app.get("/driver", (req, res) => {

    if (!driverLoggedIn) {
        return res.send(`
            <h2>🚍 DRIVER LOGIN</h2>
            <form method="POST" action="/driver-login">
                <input name="password" type="password" placeholder="Driver Password" required />
                <button>Login</button>
            </form>
        `);
    }

    res.send(driverDashboard());
});

app.post("/driver-login", (req, res) => {
    const { password } = req.body;

    if (password === DRIVER_PASSWORD) {
        driverLoggedIn = true;
        return res.redirect("/driver");
    }

    res.send("❌ Wrong driver password");
});

// -----------------------------
// AUTH MIDDLEWARE (ADMIN)
// -----------------------------
function auth(req, res, next) {
    if (!isAdminLoggedIn) return res.redirect("/login");
    next();
}

// -----------------------------
// ADMIN DASHBOARD (ANALYTICS)
// -----------------------------
app.get("/", auth, (req, res) => {

    let totalRevenue = Object.values(matatus)
        .reduce((sum, m) => sum + m.revenue, 0);

    let passengerCount = Object.keys(passengers).length;

    let fleetHTML = Object.entries(matatus)
        .map(([id, m]) => `
            <div style="border:1px solid #ddd;padding:10px;margin:10px;width:200px;">
                <h3>🚌 ${id}</h3>
                <p>Revenue: KES ${m.revenue}</p>
                <div style="color:green;">${"█".repeat(Math.floor(m.revenue / 10))}</div>
            </div>
        `).join("");

    let passengerHTML = Object.entries(passengers)
        .map(([id, p]) => `
            <div style="padding:6px;border-bottom:1px solid #eee;">
                <b>${p.name}</b> | ${id} | KES ${p.balance}
            </div>
        `).join("");

    res.send(`
    <html>
    <body style="font-family:Arial;background:#f4f6f9;padding:20px;">

        <h1>📊 SACCO ADMIN DASHBOARD</h1>
        <a href="/logout">Logout</a>

        <h2>💰 Total Revenue: KES ${totalRevenue}</h2>
        <h3>👥 Passengers: ${passengerCount}</h3>

        <h2>🚌 Fleet</h2>
        <div style="display:flex;gap:10px;">
            ${fleetHTML}
        </div>

        <h2>👥 Passenger List</h2>
        <div style="background:white;padding:10px;">
            ${passengerHTML}
        </div>

        <h2>⚡ Actions</h2>

        <button onclick="fetch('/tap/1001').then(()=>location.reload())">Tap DIBA</button>
        <button onclick="fetch('/mpesa/1002/200').then(()=>location.reload())">MPESA MATAZA +200</button>
        <button onclick="fetch('/register/1004/JUMA/300').then(()=>location.reload())">Register JUMA</button>

    </body>
    </html>
    `);
});

// -----------------------------
// DRIVER DASHBOARD
// -----------------------------
function driverDashboard() {
    return `
    <html>
    <body style="font-family:Arial;padding:20px;background:#eef2f7;">

        <h1>🚍 DRIVER APP</h1>

        <h3>Tap Passenger</h3>
        <input id="card" placeholder="Card ID" />
        <button onclick="tap()">Tap</button>

        <h3>M-PESA Topup</h3>
        <input id="mpesaCard" placeholder="Card ID" />
        <input id="amount" placeholder="Amount" />
        <button onclick="mpesa()">Send</button>

        <br><br>
        <a href="/logout-driver">Logout Driver</a>

        <script>
            function tap() {
                let id = document.getElementById('card').value;
                fetch('/tap/' + id).then(()=>alert('Tapped'));
            }

            function mpesa() {
                let id = document.getElementById('mpesaCard').value;
                let amt = document.getElementById('amount').value;
                fetch('/mpesa/' + id + '/' + amt).then(()=>alert('Paid'));
            }
        </script>

    </body>
    </html>
    `;
}

// -----------------------------
// TAP SYSTEM
// -----------------------------
app.get("/tap/:id", (req, res) => {
    let id = req.params.id;

    if (passengers[id] && passengers[id].balance >= fare) {
        passengers[id].balance -= fare;
        matatus.MAT001.revenue += fare;
    }

    saveData();
    res.send("OK");
});

// -----------------------------
// MPESA TOPUP
// -----------------------------
app.get("/mpesa/:id/:amount", (req, res) => {
    let id = req.params.id;
    let amount = Number(req.params.amount);

    if (passengers[id]) {
        passengers[id].balance += amount;
    }

    saveData();
    res.send("OK");
});

// -----------------------------
// REGISTER
// -----------------------------
app.get("/register/:id/:name/:amount", (req, res) => {
    let { id, name, amount } = req.params;

    passengers[id] = {
        name,
        balance: Number(amount)
    };

    saveData();
    res.send("OK");
});

// -----------------------------
// LOGOUTS
// -----------------------------
app.get("/logout", (req, res) => {
    isAdminLoggedIn = false;
    res.redirect("/login");
});

app.get("/logout-driver", (req, res) => {
    driverLoggedIn = false;
    res.redirect("/driver");
});

// -----------------------------
// START SERVER
// -----------------------------
app.listen(3000, () => {
    console.log("🚍 MATATU SYSTEM v14 RUNNING");
    console.log("Admin: http://localhost:3000/login");
    console.log("Driver: http://localhost:3000/driver");
});
