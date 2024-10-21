// =========================
// Initialization
// =========================

// Initialize variables
let selectedItems = [];
const modes = ['Player', 'Club', 'Nation', 'League'];
let currentModeIndex = 0; // 0 = Player, 1 = Club, 2 = Nation, 3 = League

// Mode Images Mapping
const modeImages = {
    'Player': 'static/Images/player.png',
    'Club': 'static/Images/club.png',
    'Nation': 'static/Images/GreyMap.png',
    'League': 'static/Images/leagues.png'
};

// =========================
// Event Listeners
// =========================

// Close search results and clear search input if clicking outside
document.addEventListener('click', function(event) {
    const searchBox = document.getElementById('searchBox');
    const searchResults = document.getElementById('searchResults');

    // Check if the click is outside the search box and search results
    if (!searchBox.contains(event.target)) {
        searchBox.value = ''; // Clear the search box
        searchResults.innerHTML = ''; // Clear the search results
    }
});


// =========================
// Mode Switching Functionality
// =========================

function switchMode(direction) {
    const modeLabel = document.getElementById('modeLabel');
    const modeImage = document.getElementById('modeImage');
    const searchBox = document.getElementById('searchBox');
    const searchResults = document.getElementById('searchResults');
    const formationBox = document.getElementById('formationBox');
    const submitButton = document.getElementById('submitButton');
    const harmonicMeanElement = document.getElementById('harmonic-mean-value');

    // Update mode index based on direction
    if (direction === 'next') {
        currentModeIndex = (currentModeIndex + 1) % modes.length;
    } else if (direction === 'prev') {
        currentModeIndex = (currentModeIndex - 1 + modes.length) % modes.length;
    }

    const currentMode = modes[currentModeIndex];
    modeLabel.textContent = `${currentMode} Mode`;
    searchBox.placeholder = `Search ${currentMode.toLowerCase()}s...`;

    // Update the mode image
    modeImage.src = modeImages[currentMode];

    // Clear selected items and search results
    selectedItems = [];
    updateSelectedItems();
    searchResults.innerHTML = '';
    searchBox.value = '';

    formationBox.disabled = false;
    submitButton.style.display = 'inline-block';

    // Reset harmonic mean display
    harmonicMeanElement.textContent = 'N/A';
}

// =========================
// Search Functionality
// =========================

// Function to search items (players, clubs, nations, or leagues) based on current mode
async function searchItems() {
    const query = document.getElementById('searchBox').value.trim();
    const searchResults = document.getElementById('searchResults');

    if (query.length === 0) {
        searchResults.innerHTML = "";
        return;
    }

    const currentMode = modes[currentModeIndex];
    let endpoint = '';
    let itemsKey = '';
    let extractShortName, extractImageUrl;

    switch (currentMode) {
        case 'Player':
            endpoint = '/search_players';
            itemsKey = 'matching_players';
            extractShortName = (item) => item.short_name;
            extractImageUrl = (item) => item.face_url;
            break;
        case 'Club':
            endpoint = '/search_clubs';
            itemsKey = 'matching_clubs';
            extractShortName = (item) => item.short_name;
            extractImageUrl = (item) => item.face_url || item.logo_url;
            break;
        case 'Nation':
            endpoint = '/search_nations';
            itemsKey = 'matching_nations';
            extractShortName = (item) => item.short_name;
            extractImageUrl = (item) => item.nation_url;
            break;
        case 'League':
            endpoint = '/search_leagues';
            itemsKey = 'matching_leagues';
            extractShortName = (item) => item.short_name;
            extractImageUrl = (item) => item.league_url;
            break;
        default:
            console.error('Unknown mode:', currentMode);
            return;
    }

    try {
        const response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            console.error('Error fetching search results');
            searchResults.innerHTML = `<li>Error fetching results</li>`;
            return;
        }

        const data = await response.json();

        // Determine the correct key based on the current mode
        const items = data[itemsKey];

        if (!items || !Array.isArray(items)) {
            console.error(`Expected ${itemsKey} in response`);
            searchResults.innerHTML = `<li>No results found.</li>`;
            return;
        }

        let resultsHTML = '';
        items.forEach(item => {
            const shortName = extractShortName(item);
            const imageUrl = extractImageUrl(item);
            resultsHTML += `
                <li onclick="addItem('${shortName} | ${item.index} | ${imageUrl}')">
                    <img src="${imageUrl}" onerror="this.onerror=null;this.src='static/Images/default.png';" alt="${shortName}" style="width: 30px; height: 30px; margin-right: 10px;">
                    ${item.long_name}
                </li>
            `;
        });

        searchResults.innerHTML = resultsHTML;
    } catch (error) {
        console.error('Error:', error);
        searchResults.innerHTML = `<li>Failed to fetch results</li>`;
    }
}

// =========================
// Selected Items Management
// =========================

// Add item to selected list
function addItem(item) {
    if (!selectedItems.includes(item)) {
        selectedItems.push(item);
        updateSelectedItems();
    }
}

// Remove item from selected list
function removeItem(item) {
    selectedItems = selectedItems.filter(i => i !== item);
    updateSelectedItems();
}

// Update the selected items list display
function updateSelectedItems() {
    let selectedHTML = '';
    selectedItems.forEach(item => {
        const [shortName, index, imageUrl] = item.split(" | ");
        selectedHTML += `
            <li class="selected-item">
                <span>${shortName}</span>
                <button onclick="removeItem('${item}')" class="remove-button" style="border: none; background: none; cursor: pointer; font-size: 16px;">×</button>
            </li>`;
    });
    document.getElementById("selectedItems").innerHTML = selectedHTML;
}

// =========================
// Formation Input Handling
// =========================

document.getElementById('formationBox').addEventListener('input', handleFormationInput);
document.getElementById('formationBox').addEventListener('keydown', handleFormationKeyDown);


function handleFormationInput(event) {
    let formationInput = event.target.value;
    // Remove any existing hyphens for processing
    formationInput = formationInput.replace(/-/g, '');

    // Calculate the current sum of the digits
    let digits = formationInput.split('').map(Number);
    let totalSum = digits.reduce((sum, digit) => sum + digit, 0);

    // Only add hyphens if the total sum of digits is less than 10
    if (totalSum <= 10) {
        let formattedInput = '';
        let currentSum = 0;
        
        // Loop through the input digits and insert hyphens where necessary
        for (let i = 0; i < digits.length; i++) {
            if (i > 0 && currentSum < 10) {
                formattedInput += '-';
            }
            formattedInput += digits[i];
            currentSum += digits[i];

            if (currentSum >= 10) break; // Stop inserting when the sum reaches 10
        }

        event.target.value = formattedInput;
    }
}

function handleFormationKeyDown(event) {
    // Allow backspace or delete, but block if the sum is already 10
    let formationInput = event.target.value.replace(/-/g, '');
    let digits = formationInput.split('').map(Number);
    let totalSum = digits.reduce((sum, digit) => sum + digit, 0);

    if (totalSum >= 10 && event.key !== 'Backspace' && event.key !== 'Delete') {
        event.preventDefault();
    }
}


// Function to handle formation box input

// =========================
// Form Submission
// =========================

// Submit the selected items and formation
async function submitSelection() {
    const currentMode = modes[currentModeIndex];
    let formationInput = document.getElementById('formationBox').value.trim() || "4-3-3";
    
    // Remove trailing dash if present
    if (formationInput.endsWith('-')) {
        formationInput = formationInput.slice(0, -1);
    }
    // Validate formation format (e.g., "4-3-3", "4-2-3-1")
    const formationPattern = /^(\d+-)*\d+$/;
    if (!formationPattern.test(formationInput)) {
        alert("Please enter a valid formation (e.g., 4-3-3, 4-2-3-1).");
        return;
    }

    const formation = formationInput || '4-3-3';
    let data = {};
    let endpoint = '';

    if (currentMode === 'Player') {
        const itemIndexes = selectedItems.map(item => item.split(" | ")[1]); // Extract the index
        data = {
            player_index: itemIndexes,
            formation: formation
        };
        endpoint = '/select_players/';
    } else if (currentMode === 'Club') {
        const clubNames = selectedItems.map(item => item.split(" | ")[0]); // Extract the club name
        data = {
            clubs: clubNames,
            formation: formation
        };
        endpoint = '/select_clubs/';
    } else if (currentMode === 'Nation') {
        const nationNames = selectedItems.map(item => item.split(" | ")[0]); // Extract the nation name
        data = {
            nations: nationNames,
            formation: formation
        };
        endpoint = '/select_nations/';
    } else if (currentMode === 'League') {
        const itemIndexes = selectedItems.map(item => item.split(" | ")[1]); // Extract the index
        data = {
            leagues: itemIndexes,
            formation: formation
        };
        endpoint = '/select_leagues/';
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const responseData = await response.json();
            // Proceed to update the formation on the field
            updateFormation(responseData);
            console.log(responseData);
            // Optionally, calculate and display harmonic mean
            updateHarmonicMean(responseData);
        } else {
            alert("There was an issue submitting the selection.");
        }
    } catch (error) {
        console.error('Error:', error);
        alert("Failed to submit selection.");
    }
}

// =========================
// Formation Visualization
// =========================

// Function to update formation and dynamically place items
function updateFormation(parsedData) {
    const formationInput = document.getElementById("formationBox").value.trim() || "4-3-3";
    const formation = formationInput.split('-').map(Number);

    // Validate formation input
    if (formation.length < 3 || formation.length > 5) {
        alert("Invalid formation. Use formats like 4-3-3, 3-5-2, or 4-2-3-1.");
    }

    // Check for total outfield players (should be 10, excluding the goalkeeper)
    if (formation.reduce((acc, val) => acc + val, 0) !== 10) {
        alert("Invalid formation. The total number of outfield players must be 10.");
        return;
    }

    const playersDiv = document.getElementById("players");
    playersDiv.innerHTML = ''; // Clear existing players

    // Parse player data and place them on the field
    let defenders = formation[0];
    let defensiveMidfielders = formation.length === 5 ? formation[1] : 0;
    let midfielders = formation.length >= 3 ? formation[Math.floor((formation.length -1)/2)] : 0;
    let attackingMidfielders = formation.length > 3 ? formation[formation.length - 2] : 0;
    let forwards = formation[formation.length - 1];

    // Add Goalkeeper
    const gk = parsedData.find(player => player.Pos === 'GK');
    if (gk) {
        createPlayerElement(gk, '40.75%', '1%');
    }
    
    

    // Place Defenders
    if (defenders > 3) {
        placeWingersAndCentrals(parsedData, defenders, 'CB', '15%', '27%', 'B');
    } else {
        // Place all defenders as central defenders (for formations with 3 or fewer defenders)
        placePlayers(parsedData, defenders, '15%', 'CB');
    }

    // Place Defensive Midfielders
    if (defensiveMidfielders > 0) {
        placePlayers(parsedData, defensiveMidfielders, '30%', 'DM');
    }

    // Place Central Midfielders
    if (midfielders > 3) {
        placeWingersAndCentrals(parsedData, midfielders, 'CM', '45%', '58%', 'M');
    } else {
        placePlayers(parsedData, midfielders, '44.25%', 'CM');
    }

    // Place Attacking Midfielders
    if (attackingMidfielders > 2 && forwards < 3) {
        placeWingersAndCentrals(parsedData, attackingMidfielders, 'AM', '60%', '62%', 'W');
    } else {
        placePlayers(parsedData, attackingMidfielders, '60%', 'AM');
    }

    // Place Forwards
    if (forwards > 2) {
        placeWingersAndCentrals(parsedData, forwards, 'ST', '80%', '70%', 'W');
    } else {
        placePlayers(parsedData, forwards, '80%', 'ST');
    }
}

// Helper function to place central players
function placePlayers(parsedData, count, xPos, role) {
    let centralCounter = 1;
    for (let i = 0; i < count; i++) {
        const player = parsedData.find(p => p.Pos === `${role}${centralCounter}`);
        if (player) {
            const yPos = ((i + 1) * (81.5 / (count + 1))) + '%';
            createPlayerElement(player, yPos, xPos);
            centralCounter++;
        }
    }
}

// Helper function to place wingers and central players
function placeWingersAndCentrals(parsedData, set, Role, xPos, xPosW, end) {
    placePlayers(parsedData, set - 2, xPos, Role);
    const leftPlayer = parsedData.find(p => p.Pos === `L${end}`);
    const rightPlayer = parsedData.find(p => p.Pos === `R${end}`);

    if (leftPlayer) {
        createPlayerElement(leftPlayer, '5%', xPosW);
    }
    if (rightPlayer) {
        createPlayerElement(rightPlayer, '78%', xPosW);
    }
}

// =========================
// Player Element Creation
// =========================

// Function to create and place a player/item element on the field
function createPlayerElement(player, top, left) {
    const playersDiv = document.getElementById("players");

    const playerElement = document.createElement('div');
    playerElement.classList.add('player');
    playerElement.style.top = top;   // Use percentages
    playerElement.style.left = left; // Use percentages
    playerElement.style.zIndex = '2'; // Default z-index

    // Change background color based on the rating
    if (player.Rating >= 80) {
        playerElement.style.backgroundColor = '#ECD37C';
    } else if (player.Rating >= 70) {
        playerElement.style.backgroundColor = '#E5E5E5';
    } else {
        playerElement.style.backgroundColor = '#C89E72';
    }

    // Create a container for name, player-face, and rating
    const playerInfoContainer = document.createElement('div');
    playerInfoContainer.classList.add('player-info-container');

    // Player name
    const playerName = document.createElement('div');
    playerName.classList.add('name');
    playerName.innerText = player.Name;

    // Player image
    const playerImg = document.createElement('img');
    // Handle different possible image URLs based on mode
    playerImg.src = player.player_face_url || player.face_url || player.logo_url || 'static/Images/default.png';
    playerImg.alt = player.Name;
    playerImg.classList.add('player-face');
    playerImg.onerror = () => {
        playerImg.src = 'static/Images/default.png'; // Default image URL
    };

    // Player rating
    const playerRating = document.createElement('div');
    playerRating.classList.add('rating');
    playerRating.innerText = Math.round(player.Rating);

    // Append name, image, and rating to the container
    playerInfoContainer.appendChild(playerName);
    playerInfoContainer.appendChild(playerImg);
    playerInfoContainer.appendChild(playerRating);

    // Append the container to the player element
    playerElement.appendChild(playerInfoContainer);

    // Expanded information section (hidden by default)
    const expandedInfo = document.createElement('div');
    expandedInfo.classList.add('expanded-info');

    // Function to fetch player attributes from an API
    const fetchPlayerDetails = async () => {
        try {
            const response = await fetch(`/PlayerInfo/${player.index}`); // Fetch player details using their ID
            if (response.ok) {
                const data = await response.json();
                expandedInfo.innerHTML = `
                    <p>GK: <b>${data["GK Rating"].toFixed(2)}</b></p>
                    <p>CB: <b>${data["CB Rating"].toFixed(2)}</b></p>
                    <p>FB: <b>${data["FB Rating"].toFixed(2)}</b></p>
                    <p>DM: <b>${data["DM Rating"].toFixed(2)}</b></p>
                    <p>CM: <b>${data["CM Rating"].toFixed(2)}</b></p>
                    <p>WM: <b>${data["WM Rating"].toFixed(2)}</b></p>
                    <p>AM: <b>${data["CAM Rating"].toFixed(2)}</b></p>
                    <p>WF: <b>${data["W Rating"].toFixed(2)}</b></p>
                    <p>ST: <b>${data["ST Rating"].toFixed(2)}</b></p>
                `;
            } else {
                expandedInfo.innerHTML = `<p>Error loading player details.</p>`;
            }
        } catch (error) {
            expandedInfo.innerHTML = `<p>Failed to load data.</p>`;
        }
    };

    // Add click event to expand/close the player card and fetch the info
    playerElement.onclick = () => {
        const isExpanded = playerElement.classList.contains('expanded');
        closeAllPlayerCards();

        if (!isExpanded) {
            playerElement.classList.add('expanded');
            playerElement.style.zIndex = '10';

            if (!expandedInfo.innerHTML.includes("GK")) {
                fetchPlayerDetails();
            }
        } else {
            playerElement.classList.remove('expanded');
            playerElement.style.zIndex = '2';
        }
    };

    // Append expanded info to the player element
    playerElement.appendChild(expandedInfo);

    // Append player element to the players div
    playersDiv.appendChild(playerElement);
}

// Function to close all player cards and reset their z-index
function closeAllPlayerCards() {
    const allPlayers = document.querySelectorAll('.player');
    allPlayers.forEach(player => {
        player.classList.remove('expanded');
        player.style.zIndex = '2'; // Reset z-index for all players
    });
}

// =========================
// Harmonic Mean Calculation
// =========================

// Function to calculate harmonic mean of ratings
function calculateHarmonicMean(ratings) {
    if (ratings.length === 0) return 0;

    const reciprocalSum = ratings.reduce((sum, rating) => sum + (1 / rating), 0);
    return ratings.length / reciprocalSum;
}

// Function to update the harmonic mean display
function updateHarmonicMean(parsedData) {
    const ratings = parsedData.map(player => player.Rating);
    const harmonicMean = calculateHarmonicMean(ratings);

    // Display the harmonic mean value
    const harmonicMeanElement = document.getElementById("harmonic-mean-value");
    harmonicMeanElement.textContent = harmonicMean.toFixed(2);
}

// =========================
// Optional: Debounce Function for Search Input
// =========================

// Optional: Implementing a debounce to reduce API calls during fast typing
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Attach the debounced search function to the input event
document.getElementById('searchBox').removeEventListener('input', searchItems); // Remove existing listener
document.getElementById('searchBox').addEventListener('input', debounce(searchItems, 300));
