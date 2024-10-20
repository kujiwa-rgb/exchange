document.addEventListener('DOMContentLoaded', () => {
    console.log('JavaScript loaded successfully!');

        // Function to fetch user balance from the server
        let userBalance = 0.00; // Initialize with a default value

        async function fetchUserBalance() {
            try {
                const response = await fetch(`/api/user/balance`);
                if (response.ok) {
                    const data = await response.json();
                    userBalance = parseFloat(data.balance); // Update the global userBalance
                    console.log(`User Balance fetched: ${userBalance}`);
                    updateBalanceDisplay();
                } else {
                    console.error('Error fetching user balance:', await response.text());
                }
            } catch (error) {
                console.error('Error connecting to user balance API:', error);
            }
        }

        // Automatically call the function when the page loads
        fetchUserBalance();


        // Retrieve active tab from localStorage
        let activeTab = localStorage.getItem('activeTab');

        // If activeTab is null or invalid, default to 'home'
        if (!activeTab || activeTab === 'null') {
            activeTab = 'home';
        }

        openTab(null, activeTab);

        // Fetch all tab-link buttons using querySelectorAll
        const tabButtons = document.querySelectorAll('.tab-link');

        // Add an event listener to each tab-button
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = button.getAttribute('data-tab'); // Get the tab name from the data-tab attribute
                openTab(e, tabName); // Call the openTab function

                // Save the active tab to localStorage
                localStorage.setItem('activeTab', tabName);
            });
        });

        // Define the openTab function
        function openTab(evt, tabName) {
            // Hide all tab contents
            const tabContent = document.getElementsByClassName("tab-content");
            for (let i = 0; i < tabContent.length; i++) {
                tabContent[i].style.display = "none";
            }

            // Remove the active class from all buttons
            const tabLinks = document.getElementsByClassName("tab-link");
            for (let i = 0; i < tabLinks.length; i++) {
                tabLinks[i].classList.remove("active");
            }

            // Display the clicked tab's content and set the active class
            const activeTabElement = document.getElementById(tabName);
            if (activeTabElement) {
                activeTabElement.style.display = "block";
                if (evt) evt.currentTarget.classList.add("active");
            } else {
                console.error(`Tab with ID "${tabName}" not found.`);
            }
        }

        console.log('Tabs initialized successfully.');
        // Custom dropdown logic
        const selectBox = document.querySelector('.select-selected');
        const optionsBox = document.querySelector('.select-items');
        const options = document.querySelectorAll('.select-option');

        if (selectBox) {
            selectBox.addEventListener('click', (e) => {
                optionsBox.classList.toggle('select-hide');
                e.stopPropagation(); // Stop click event from bubbling up to document
            });
        }

        options.forEach(option => {
            option.addEventListener('click', () => {
                // Update the selected option in the select box
                selectBox.innerHTML = option.innerHTML;
                selectBox.dataset.crypto = option.dataset.crypto; // Update the selected crypto type

                // Hide the dropdown options
                optionsBox.classList.add('select-hide');

                // Debugging: Log the selected crypto
                console.log('Selected Crypto:', option.dataset.crypto);
            });
        });

        // Event listener to update the price in the withdrawal form when selecting a cryptocurrency
        if (selectBox) {
            selectBox.addEventListener('click', async () => {
                const crypto = selectBox.dataset.crypto; // 'btc' or 'eth'
                if (!crypto) {
                    console.error('No crypto selected');
                    return;
                }
                try {
                    const response = await fetch(`/api/crypto-price?crypto=${crypto}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch crypto price.');
                    }
                    const data = await response.json();
                    selectBox.dataset.price = data.price; // Update the price in the dataset
                    console.log('Updated Crypto Price:', data.price);
                } catch (err) {
                    console.error('Error fetching crypto price:', err);
                }
            });
        }


        // Hide options if clicking outside
        document.addEventListener('click', function (e) {
            if (!selectBox.contains(e.target) && !optionsBox.contains(e.target)) {
                optionsBox.classList.add('select-hide');
            }
        });

      // Crypto selection function to handle updates for Deposit tab
      const cryptoButtons = document.querySelectorAll('.crypto-btn');
      cryptoButtons.forEach(button => {
        button.addEventListener('click', () => {
            const crypto = button.getAttribute('data-crypto');
            selectCrypto(crypto);
        });
        });

      function selectCrypto(crypto) {
        const cryptoDetails = document.getElementById('crypto-details');
        const cryptoName = document.getElementById('crypto-name');
        const walletAddress = document.getElementById('wallet-address');
        const qrCodeDiv = document.getElementById('qr-code');

        let address, qrCodeImagePath;

        // Define wallet addresses and QR codes for BTC and ETH
        if (crypto === 'btc') {
            cryptoName.textContent = 'Bitcoin (BTC)';
            address = '19g8m1i7U2Yc5TNoAD5DfDUzWS4HxmoHrn'; // Replace with your actual BTC address
            qrCodeImagePath = '/btc-qr.png'; // Path to your static QR code image
        } else if (crypto === 'eth') {
            cryptoName.textContent = 'Ethereum (ETH)';
            address = '0xf71bbd1F1048b563cDa9F04Bb56BAD30Ef34a78A'; // Replace with your actual ETH address
            qrCodeImagePath = '/eth-qr.png'; // Path to your static QR code image
        }

        walletAddress.textContent = address;

        // Use the static QR code image
        qrCodeDiv.innerHTML = `<img src="${qrCodeImagePath}" alt="QR Code" width="150">`;

        // Show crypto details section
        cryptoDetails.style.display = 'block';
        }
        
        // Form submission logic for withdrawal form
        const withdrawForm = document.querySelector('#withdraw-form');
        if (withdrawForm) {
            withdrawForm.addEventListener('submit', async (e) => {
                e.preventDefault(); // Prevent default submission

                const cryptoSelect = document.querySelector('.select-selected');
                const amountInput = document.querySelector('#withdraw-amount');
                const balanceDisplay = document.querySelector('#user-balance');
                const errorDisplay = document.getElementById('withdraw-error');
                const addressInput = document.querySelector('#withdraw-address');
                
                const cryptoType = cryptoSelect.dataset.crypto; // 'btc' or 'eth'
                const amount = parseFloat(amountInput.value);
                const address = addressInput.value;

                // Debug: Log the selected crypto type and withdrawal details
                console.log('Selected Crypto Type:', cryptoType);
                console.log('Amount:', amount);
                console.log('Address:', address);

                if (!cryptoType) {
                    errorDisplay.textContent = 'Please select a cryptocurrency.';
                    errorDisplay.style.display = 'block';
                    return;
                }

                if (isNaN(amount) || amount <= 0) {
                    errorDisplay.textContent = 'Please enter a valid withdrawal amount.';
                    errorDisplay.style.display = 'block';
                    return;
                }

                if (isNaN(userBalance)) {
                    console.error('User balance is not a valid number.');
                    errorDisplay.textContent = 'Error fetching user balance. Please try again later.';
                    errorDisplay.style.display = 'block';
                    return;
                }

                try {
                    // Fetch the current price of the selected cryptocurrency
                    const response = await fetch(`/api/crypto-price?crypto=${cryptoType}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch crypto price.');
                    }

                    const data = await response.json();
                    const cryptoPrice = parseFloat(data.price);
                    console.log('Crypto Price:', cryptoPrice);

                    // Calculate the equivalent USD value
                    const equivalentUSD = amount * cryptoPrice;

                    // Check if the user has enough balance
                    if (equivalentUSD > userBalance) {
                        errorDisplay.textContent = 'Insufficient balance to make this withdrawal.';
                        errorDisplay.style.display = 'block';
                        return;
                    }

                    // Clear any previous error messages
                    errorDisplay.textContent = '';
                    errorDisplay.style.display = 'none';

                    // If all checks pass, submit the form (mock)
                    console.log('Form validation passed. Submitting form...');
                    // withdrawForm.submit(); // Uncomment when ready to submit for real
                } catch (err) {
                    console.error('Error fetching crypto price:', err);
                    errorDisplay.textContent = 'Error fetching crypto price. Please try again later.';
                    errorDisplay.style.display = 'block';
                }
            });
        }

        // Hide options if clicking outside
        document.addEventListener('click', function (e) {
            if (!selectBox.contains(e.target) && !optionsBox.contains(e.target)) {
                optionsBox.classList.add('select-hide');
            }
        });

        // Now, proceed to the other features after tabs are working.

        // --- Proceed with other event handlers and logic ---
        // Store the selected pair in a variable
        let selectedPair = null;
        let priceInterval = null;
        let currentPrices = {}; // To hold current bid and ask prices
        
        // Function to fetch initial prices from the server
        function fetchInitialPrices() {
          fetch('/update-prices')
            .then(response => response.json())
            .then(data => {
              currentPrices = {
                bitcoin: {
                  bid: data.bitcoin.bid,
                  ask: data.bitcoin.ask,
                },
                ethereum: {
                  bid: data.ethereum.bid,
                  ask: data.ethereum.ask,
                },
              };
        
              updateDisplayedPrices();
            })
            .catch(error => console.error('Error fetching initial prices:', error));
        }
        
        // Function to simulate live price changes every 3 seconds
        function simulatePriceChange() {
          if (!selectedPair) return;
        
          const randomChange = () => (Math.random() - 0.5) * 10; // Random change between -5 and +5
        
          if (selectedPair === 'BTC') {
            currentPrices.bitcoin.bid += randomChange();
            currentPrices.bitcoin.ask += randomChange();
          } else if (selectedPair === 'ETH') {
            currentPrices.ethereum.bid += randomChange();
            currentPrices.ethereum.ask += randomChange();
          }
        
          updateDisplayedPrices();
        }
        
        // Function to update displayed prices in the DOM
        function updateDisplayedPrices() {
          if (selectedPair === 'BTC') {
            document.getElementById('bid-price').textContent = `Bid: ${currentPrices.bitcoin.bid.toFixed(2)} USD`;
            document.getElementById('ask-price').textContent = `Ask: ${currentPrices.bitcoin.ask.toFixed(2)} USD`;
          } else if (selectedPair === 'ETH') {
            document.getElementById('bid-price').textContent = `Bid: ${currentPrices.ethereum.bid.toFixed(2)} USD`;
            document.getElementById('ask-price').textContent = `Ask: ${currentPrices.ethereum.ask.toFixed(2)} USD`;
          }
        }

        // Function to simulate fake order book
        function simulateOrderBook() {
        if (!selectedPair) return;

        // Generate random buy and sell orders
        const buyOrders = generateFakeOrders('buy');
        const sellOrders = generateFakeOrders('sell');

        // Clear existing orders
        const buyOrderList = document.getElementById('buy-order-list');
        const sellOrderList = document.getElementById('sell-order-list');
        buyOrderList.innerHTML = '';
        sellOrderList.innerHTML = '';

        // Append new orders to the order book
        buyOrders.forEach((order, index) => {
            const li = document.createElement('li');
            li.textContent = `Buy: $${order.price.toFixed(2)}  Quantity: ${order.quantity.toFixed(2)} ${selectedPair}`;
            li.style.color = 'green'; // Color for buy orders
            buyOrderList.appendChild(li);
        });

        sellOrders.forEach((order, index) => {
            const li = document.createElement('li');
            li.textContent = `Sell: $${order.price.toFixed(2)}  Quantity: ${order.quantity.toFixed(2)} ${selectedPair}`;
            li.style.color = 'red'; // Color for sell orders
            sellOrderList.appendChild(li);
        });
        }
        
        // Function to generate fake orders for buy or sell
        function generateFakeOrders(type) {
            const orders = [];
            for (let i = 0; i < 5; i++) {
            const randomQuantity = Math.random() * 4.999 + 0.01 ; // Generate a random quantity as a number
            let randomPrice;
            if (selectedPair === 'BTC') {
                if (type === 'buy') {
                randomPrice = currentPrices.bitcoin.bid - (Math.random() * 0.01);
                } else {
                randomPrice = currentPrices.bitcoin.ask + (Math.random() * 0.01);
                }
            } else if (selectedPair === 'ETH') {
                if (type === 'buy') {
                randomPrice = currentPrices.ethereum.bid - (Math.random() * 0.1);
                } else {
                randomPrice = currentPrices.ethereum.ask + (Math.random() * 0.1);
                }
            }
        
            orders.push({
                quantity: randomQuantity, // Store the quantity as a number
                price: randomPrice,
            });
            }
            return orders;
        }
        
        // Call the simulateOrderBook function every 3 seconds
        setInterval(simulateOrderBook, 3000);

        // Handle trading pair selection logic
        const pairButtons = document.querySelectorAll('.pair-button');
        pairButtons.forEach(button => {
          button.addEventListener('click', (e) => {
            // Update the selected pair
            selectedPair = e.currentTarget.dataset.pair.toUpperCase().split('-')[0]; // Extract 'BTC' or 'ETH'
        
            // Clear any previous interval to avoid overlapping intervals
            if (priceInterval) {
              clearInterval(priceInterval);
            }
        
            // Fetch and update initial prices
            fetchInitialPrices();
        
            // Set interval to simulate price changes every 3 seconds
            priceInterval = setInterval(simulatePriceChange, 3000);
        
            // Update the price info section display
            const selectedPairName = document.getElementById('selected-pair-name');
            selectedPairName.textContent = `${selectedPair}/USD`;
        
            const priceInfoSection = document.querySelector('.price-info');
            priceInfoSection.style.display = 'block';
        
            const tradeAmountSection = document.querySelector('.trade-amount');
            tradeAmountSection.style.display = 'block';
        
            const leverageSelectionSection = document.querySelector('.leverage-selection');
            leverageSelectionSection.style.display = 'block';
        
            const buySellButtonsSection = document.querySelector('.buy-sell-buttons');
            buySellButtonsSection.style.display = 'block';
        
            console.log('Selected Trading Pair:', selectedPair);
          });
        });
        
        // Handle leverage selection
        let selectedLeverage = '10x';
        let tradeAmount = 0;
        let openTrades = [];
        let tradeIdCounter = 1; // Counter for generating unique trade IDs

        // Handle leverage selection
        document.querySelectorAll('.leverage-button').forEach(button => {
            button.addEventListener('click', () => {
                // Get the leverage value from the button's dataset
                const leverageValue = button.dataset.leverage;

                // Store the selected leverage value
                selectedLeverage = leverageValue;

                // Highlight the selected leverage button
                document.querySelectorAll('.leverage-button').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');

                // Now you can use the selectedLeverage variable in your API request to the backend
                console.log('Selected Leverage:', selectedLeverage);
            });
        });

        // Handle trade amount input
        function handleTradeAmountUpdate() {
            const inputAmount = parseFloat(document.getElementById('trade-amount-input').value);
            console.log(`Input amount received: ${inputAmount}`);
        
            if (!isNaN(inputAmount) && inputAmount > 0) {
                tradeAmount = inputAmount;
                console.log(`Trade Amount updated: ${tradeAmount}`);
            } else {
                console.log('Invalid trade amount entered, keeping previous value.');
            }
        }
        
        const tradeAmountInput = document.getElementById('trade-amount-input');
        tradeAmountInput.addEventListener('input', handleTradeAmountUpdate);
        tradeAmountInput.addEventListener('change', handleTradeAmountUpdate);

        // Handle Buy & Sell Actions
        async function executeTrade(type, amount, leverage, pair) {
            console.log('Executing trade...');
            console.log(`Trade Type: ${type}, Amount: ${amount}, Leverage: ${leverage}`);
            console.log(`User Balance at Start: ${userBalance}`);
            console.log(`Selected Pair: ${pair}`);
        
            // Step 1: Validate the input values
            if (isNaN(amount) || isNaN(userBalance) || amount <= 0 || userBalance <= 0) {
                console.error('Invalid trade amount or insufficient balance. Amount:', amount, 'User Balance:', userBalance);
                alert("Invalid trade amount or insufficient balance.");
                return;
            }
        
            // Step 2: Extract the numeric value from leverage
            const leverageMultiplier = parseFloat(leverage.replace('x', ''));
            console.log(`Leverage Multiplier: ${leverageMultiplier}`);
        
            if (isNaN(leverageMultiplier) || leverageMultiplier <= 0) {
                console.error('Invalid leverage value.');
                alert("Invalid leverage value.");
                return;
            }
        
            // Step 3: Send the trade to the backend
            try {
                const response = await fetch('/api/trade', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ type, amount, leverage, pair }) 
                });
        
                // Step 4: Handle the backend response
                if (response.ok) {
                    const data = await response.json(); // Get trade info including trades list and balance
                    console.log(`Trade executed successfully:`, data.trade);
        
                    // Update open trades with the returned trades data
                    displayOpenTrades(data.trades);
        
                    // Update user balance with the updated value from the backend
                    userBalance = parseFloat(data.balance);
                    console.log(`Updated User Balance: ${userBalance}`);
                    updateBalanceDisplay(); // Update the balance display in the UI
                } else {
                    const error = await response.text();
                    console.error('Error executing trade:', error);
                    alert(error); // Show error message
                }
            } catch (error) {
                console.error('Error connecting to trade API:', error);
                alert('Error connecting to trade API. Please try again.');
            }
        }
           
        // Update balance display
        function updateBalanceDisplay() {
            const balanceElement = document.getElementById('user-balance');
            balanceElement.textContent = `${userBalance.toFixed(2)}`;
        }

        // Close Trade Functionality
        async function closeTrade(tradeId) {
            const response = await fetch('/api/close-trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tradeId })
            });

            if (response.ok) {
                const data = await response.text();
                console.log(data); // Log success message
                openTrades = openTrades.filter(trade => trade.id !== tradeId); // Remove closed trade from openTrades
                updateBalanceDisplay();
                displayOpenTrades(); // Update the UI to show remaining open trades
            } else {
                const error = await response.text();
                alert(error); // Show error message
            }
        }

        // Function to display open trades
        function displayOpenTrades(trades) {
            const tradesList = document.getElementById('open-trades-list');
            tradesList.innerHTML = ''; // Clear existing trades

            trades.forEach(trade => {
                const tradeItem = document.createElement('li');
                tradeItem.classList.add('trade-item');

                // Container for trade details
                const tradeDetails = document.createElement('div');
                tradeDetails.classList.add('trade-details');

                // Display trade details in columns
                tradeDetails.innerHTML = `
                    <div class="trade-id">Trade ID: ${trade.id.slice(0, 8)}...</div>
                    <div class="trade-type">Type: ${trade.type}</div>
                    <div class="trade-amount">Amount: ${trade.amount}</div>
                    <div class="trade-leverage">Leverage: ${trade.leverage}</div>
                    <div class="trade-price">Price: $${parseFloat(trade.price).toFixed(2)}</div>
                    <div class="trade-pair">Pair: ${trade.pair}</div>
                `;

                // Append trade details to the trade item
                tradeItem.appendChild(tradeDetails);

                // Append the trade item to the list
                tradesList.appendChild(tradeItem);
            });
        }

        // Event listeners for buy/sell buttons
        document.getElementById('buy-button').addEventListener('click', () => {
            console.log(`Buy button clicked. Trade Amount: ${tradeAmount}, Selected Leverage: ${selectedLeverage}, Selected Pair: ${selectedPair}`);
            executeTrade('buy', tradeAmount, selectedLeverage, selectedPair);

        });

        document.getElementById('sell-button').addEventListener('click', () => {
            console.log(`Sell button clicked. Trade Amount: ${tradeAmount}, Selected Leverage: ${selectedLeverage}, Selected Pair: ${selectedPair}`);
            executeTrade('sell', tradeAmount, selectedLeverage, selectedPair);

        });


    });