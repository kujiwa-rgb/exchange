    const express = require('express');
    const axios = require('axios');
    const path = require('path');
    const mysql = require('mysql2');
    const session = require('express-session');
    const bcrypt = require('bcrypt');
    const WebSocket = require('ws');
    const http = require('http');
    const saltRounds = 10;
    const { v4: uuidv4 } = require('uuid');

    const app = express();
    const PORT = process.env.PORT || 3005;

    // Add this line to enable parsing of JSON request bodies
    app.use(express.json());
    // Set up the WebSocket server
    const server = require('http').createServer(app);
    const wss = new WebSocket.Server({ server });

    // Set EJS as the templating engine
    app.set('view engine', 'ejs');

    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));

    // Parse URL-encoded bodies
    app.use(express.urlencoded({ extended: true }));

    // Set up session middleware
    app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
    }));

    // MySQL connection setup
    const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
    });
    
    let cachedPrices = null; // To store cached prices
    let lastFetchTime = 0; // Timestamp of the last fetch

    const fetchCryptoPrices = async () => {
    const now = Date.now();
    const cacheExpiry = 600000; // 60 seconds cache expiry

    if (cachedPrices && (now - lastFetchTime) < cacheExpiry) {
        return cachedPrices; // Return cached data if it's still valid
    }

    try {
        const btcResponse = await axios.get('https://api.coincap.io/v2/assets/bitcoin');
        const ethResponse = await axios.get('https://api.coincap.io/v2/assets/ethereum');
        const btcPrice = btcResponse.data.data.priceUsd;
        const ethPrice = ethResponse.data.data.priceUsd;

        const updatePrices = {
        bitcoin: {
            bid: parseFloat(btcPrice) - (parseFloat(btcPrice) * 0.1 / 100),
            ask: parseFloat(btcPrice) + (parseFloat(btcPrice) * 0.1 / 100)
        },
        ethereum: {
            bid: parseFloat(ethPrice) - (parseFloat(ethPrice) * 0.1 / 100),
            ask: parseFloat(ethPrice) + (parseFloat(ethPrice) * 0.1 / 100)
        }
        };

        // Update the cache
        cachedPrices = updatePrices;
        lastFetchTime = now;

        return updatePrices;
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        return cachedPrices ? cachedPrices : { bitcoin: { bid: 0.00, ask: 0.00 }, ethereum: { bid: 0.00, ask: 0.00 } };
    }
    };

    // Route to serve the main page with price data and cryptocurrency data
    app.get('/', async (req, res) => {
        if (!req.session.username) {
            return res.redirect('/login'); // Ensure the user is logged in
        }

        const username = req.session.username;

        try {
            // Fetch user balance from the database
            pool.query('SELECT balance FROM users WHERE name = ?', [username], async (err, results) => {
                if (err) {
                    console.error('Error fetching user balance:', err);
                    return res.status(500).send('Error fetching balance');
                }

                // Use parseFloat to ensure userBalance is treated as a numeric value
                const userBalance = results.length > 0 ? parseFloat(results[0].balance) : 0.00;

                // Fetch cryptocurrency list data from CoinGecko API
                let cryptoData = [];
                // Fetch BTC and ETH prices from CoinCap API
                const btcResponse = await axios.get('https://api.coincap.io/v2/assets/bitcoin');
                const ethResponse = await axios.get('https://api.coincap.io/v2/assets/ethereum');
                const btcPrice = btcResponse.data.data.priceUsd;
                const ethPrice = ethResponse.data.data.priceUsd;
            
                const updatePrices = { 
                bitcoin: {
                    bid: parseFloat(btcPrice) - (parseFloat(btcPrice) * 0.1 / 100),
                    ask: parseFloat(btcPrice) + (parseFloat(btcPrice) * 0.1 / 100)
                },
                ethereum: {
                    bid: parseFloat(ethPrice) - (parseFloat(ethPrice) * 0.1 / 100),
                    ask: parseFloat(ethPrice) + (parseFloat(ethPrice) * 0.1 / 100)
                }
                };
    
                // Set the selected pair (you can get this from the database/session/etc.)
                const selectedPair = null; // default value

                try {
                    const responseMarkets = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                        params: {
                            vs_currency: 'usd',
                            order: 'market_cap_desc',
                            per_page: 10,
                            page: 1,
                            sparkline: false,
                        },
                    });
                    cryptoData = responseMarkets.data;
                } catch (cryptoError) {
                    console.error('Error fetching crypto data from CoinGecko:', cryptoError);
                }

                // Render the main.ejs file with the variables passed in
                res.render('main', { username, userBalance, cryptoData,updatePrices, selectedPair});

            });
        } catch (error) {
            console.error('Error rendering main page:', error);
            res.status(500).send('Error loading the main page');
        }
    });

    // AJAX endpoint to update bid and ask prices
    app.get('/update-prices', async (req, res) => {
        try {
        const updatePrices = await fetchCryptoPrices();
        res.json(updatePrices);
        } catch (error) {
        console.error('Error updating prices:', error);
        res.status(500).send('Error updating prices');
        }
    });

    // Updated endpoint to get user balance (using session)
    app.get('/api/user/balance', async (req, res) => {
        // Get username from session (assuming user is authenticated and username is stored in session)
        const username = req.session?.username;

        if (!username) {
            console.error('Username is not available in session.');
            return res.status(400).json({ error: 'Username is required' });
        }

        try {
            // Log the username for debugging purposes
            console.log(`Fetching balance for username: ${username}`);

            // Fetch user balance from the database using the username
            pool.query('SELECT balance FROM users WHERE name = ?', [username], (err, results) => {
                if (err) {
                    console.error('Error fetching user balance from the database:', err);
                    return res.status(500).json({ error: 'Error fetching balance' });
                }

                if (results.length > 0) {
                    console.log(`User balance for ${username}: ${results[0].balance}`);
                    res.json({ balance: results[0].balance });
                } else {
                    console.error(`User ${username} not found in the database.`);
                    res.status(404).json({ error: 'User not found' });
                }
            });
        } catch (error) {
            console.error('Unexpected error while fetching user balance:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Trade endpoint
    app.post('/api/trade', async (req, res) => {1   
        const { type, amount, leverage, pair } = req.body;

        // Ensure that username exists in the session
        const username = req.session.username;
        if (!username) {
            return res.status(400).send('User not authenticated');
        }

        console.log(`Trade Endpoint called. Type: ${type}, Amount: ${amount}, Leverage: ${leverage}, Pair: ${pair}`);

        // Validate trading pair
        const validPairs = ['BTC', 'ETH'];
        if (!validPairs.includes(pair)) {
            return res.status(400).send('Invalid trading pair');
        }

        let currentPrices;
        try {
            // Fetch prices using the cached price function
            currentPrices = await fetchCryptoPrices();
        } catch (error) {
            console.error('Error fetching cached prices:', error);
            return res.status(500).send('Failed to fetch current prices');
        }

        let executedPrice;
        if (pair === 'BTC') {
            executedPrice = type === 'buy' ? currentPrices.bitcoin.ask : currentPrices.bitcoin.bid;
        } else if (pair === 'ETH') {
            executedPrice = type === 'buy' ? currentPrices.ethereum.ask : currentPrices.ethereum.bid;
        }

        if (isNaN(executedPrice) || executedPrice <= 0) {
            return res.status(500).send('Failed to fetch valid price');
        }

        console.log(`Using Cached Price: ${executedPrice} for Pair: ${pair} (Type: ${type})`);

        // Calculate trade value considering leverage
        const leverageMultiplier = parseFloat(leverage);
        if (isNaN(leverageMultiplier) || leverageMultiplier <= 0) {
            return res.status(400).send('Invalid leverage value');
        }

        const tradeValue = amount * executedPrice * (1 / leverageMultiplier);
        console.log(`Trade Value: ${tradeValue}`);

        // Get user balance from the database
        pool.query('SELECT balance FROM users WHERE name = ?', [username], async (err, results) => {
            if (err) {
                console.error('Error fetching user balance:', err);
                return res.status(500).send('Error fetching balance');
            }

            let userBalance = results.length > 0 ? parseFloat(results[0].balance) : 0.00;

            // Add a check to make sure userBalance is a valid number
            if (isNaN(userBalance)) {
                console.error('Invalid user balance fetched from the database:', userBalance);
                return res.status(500).send('Invalid user balance');
            }

            console.log(`User Balance Retrieved: ${userBalance}`);

            // Check if the user has enough balance
            if (type === 'buy' && tradeValue > userBalance) {
                console.error('Insufficient balance for this leveraged trade');
                return res.status(400).send('Insufficient balance for this leveraged trade.');
            }

            // Update the user's balance
            if (type === 'buy') {
                userBalance -= tradeValue;
            } else if (type === 'sell') {
                userBalance += tradeValue;
            }

            // Ensure userBalance is correctly formatted after the operation
            userBalance = parseFloat(userBalance.toFixed(2)); // Keep balance to 2 decimal places for clarity

            console.log(`Updated User Balance: ${userBalance}`);

            // Update the balance in the database
            pool.query('UPDATE users SET balance = ? WHERE name = ?', [userBalance, username], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating user balance:', updateErr);
                    return res.status(500).send('Error updating balance');
                }

                // Save the trade to the trades table
                const trade = {
                    id: uuid.v4(),
                    username,
                    type,
                    amount,
                    leverage,
                    price: executedPrice,
                    pair,
                    timestamp: Date.now()
                };

                pool.query('INSERT INTO trades SET ?', trade, (insertErr) => {
                    if (insertErr) {
                        console.error('Error saving trade:', insertErr);
                        return res.status(500).send('Failed to save trade');
                    }

                    // Fetch the last 5 trades to display in the frontend
                    pool.query('SELECT * FROM trades WHERE username = ? ORDER BY timestamp DESC LIMIT 5', [username], (fetchErr, trades) => {
                        if (fetchErr) {
                            console.error('Error fetching trades:', fetchErr);
                            return res.status(500).send('Error fetching trades');
                        }

                        console.log(`Trade Executed: ${JSON.stringify(trade)}`);
                        res.json({ trade, trades });
                    });
                });
            });
        });
    });

    // Route to get crypto price for withdrawal
    app.get('/api/crypto-price', async (req, res) => {
        const crypto = req.query.crypto;
        if (!crypto) {
            return res.status(400).send({ error: 'Crypto type is required' });
        }

        try {
            // Use CoinCap API to fetch the crypto price
            const response = await axios.get(`https://api.coincap.io/v2/assets/${crypto === 'btc' ? 'bitcoin' : 'ethereum'}`);
            
            // Extract the USD price from the CoinCap response
            const cryptoPrice = parseFloat(response.data.data.priceUsd);

            if (isNaN(cryptoPrice)) {
                throw new Error('Invalid price data from CoinCap API');
            }

            res.send({ price: cryptoPrice });
        } catch (error) {
            console.error('Error fetching crypto price:', error);
            res.status(500).send({ error: 'Error fetching crypto price' });
        }
    });

    // Route to handle withdrawal form submission
    app.post('/withdraw', express.json(), async (req, res) => {
        if (!req.session.username) {
            return res.redirect('/login');
        }

        const { crypto, amount, address } = req.body;
        const username = req.session.username;

        if (!crypto || !amount || !address) {
            return res.status(400).send('All fields are required');
        }

        try {
            // Fetch user balance from the database
            pool.query('SELECT balance FROM users WHERE name = ?', [username], async (err, results) => {
                if (err) {
                    console.error('Error fetching user balance:', err);
                    return res.status(500).send('Error fetching balance');
                }

                const userBalance = results.length > 0 ? parseFloat(results[0].balance) : 0.00;

                // Fetch current crypto price from CoinCap API
                const response = await axios.get(`https://api.coincap.io/v2/assets/${crypto === 'btc' ? 'bitcoin' : 'ethereum'}`);
                const currentPrice = parseFloat(response.data.data.priceUsd);

                if (isNaN(currentPrice)) {
                    throw new Error('Invalid price data from CoinCap API');
                }

                const equivalentUSD = parseFloat(amount) * currentPrice;

                // Check if the user has enough balance
                if (equivalentUSD > userBalance) {
                    return res.status(400).send('Insufficient balance');
                }

                // Deduct the equivalent USD amount from user balance
                const updatedBalance = userBalance - equivalentUSD;

                // Update user's balance in the database
                pool.query('UPDATE users SET balance = ? WHERE name = ?', [updatedBalance, username], (err, updateResults) => {
                    if (err) {
                        console.error('Error updating user balance:', err);
                        return res.status(500).send('Error processing withdrawal');
                    }

                    res.status(200).send('Withdrawal successfully processed');
                });
            });
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            res.status(500).send('Error processing withdrawal');
        }
    });
    
    // Route to handle signup form submission
    app.post('/signup', (req, res) => {
        const { name, email, password, phone } = req.body;
    
        if (!name || !email || !password) {
        return res.status(400).send('All fields are required');
        }
    
        if (name.length > 100 || email.length > 100 || password.length > 100) {
        return res.status(400).send('Input is too long');
        }
    
        let phoneValue = phone;
        if (!phoneValue) {
        phoneValue = ''; // set default value for phone
        }
    
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phoneValue)) {
        return res.status(400).send('Invalid phone number format. Please enter a 10-digit phone number.');
        }
    
        bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).send('Error signing up');
        }
    
        const query = 'INSERT INTO users (name, email, password, phone, balance) VALUES (?, ?, ?, ?, ?)';
        pool.query(query, [name, email, hash, phoneValue, 0.00], (err, results) => { 
            if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).send('Error signing up');
            }
            res.redirect('/login');
        });        
        });
    });
  
    // Route to serve the signup page
    app.get('/signup', (req, res) => {
        res.render('signup');
    });

    // Route to serve the login page
    app.get('/login', (req, res) => {
    res.render('login');
    });

    // Route to handle login form submission
    app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    pool.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Error logging in');
        }
    
        if (results.length === 0) {
            return res.status(400).send('Invalid email or password');
        }
    
        bcrypt.compare(password, results[0].password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Error logging in');
            }
    
            if (isMatch) {
                req.session.username = results[0].name;
                res.redirect('/');
            } else {
                res.status(400).send('Invalid email or password');
            }
        });
    });    
    });

    // Route to handle logout
    app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error logging out:', err);
            return res.status(500).send('Error logging out');
        }

        // Redirect to the main page after successful logout
        res.redirect('/');
    });
    });

    // Start the server
    server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    });
