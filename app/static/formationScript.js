async function fetchBestPlayers(formation) {
    try {
        const response = await fetch(`/best_players/${formation}`);
        if (!response.ok) {
            throw new Error("Failed to fetch player data");
        }
        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error(error);
        alert("Failed to load players. Please try again.");
    }
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


// Function to update formation and dynamically place players
async function updateFormation() {
    const formationInput = document.getElementById("formationBox").value.trim() || '4-3-3';

    const formation = formationInput.split('-').map(Number);

    // Ensure correct input: Accept 3 to 5 parts (e.g., 4-3-3, 4-2-3-1, 4-1-2-1-2)
    if (formation.length < 3 || formation.length > 5) {
        alert("Invalid formation. Use formats like 4-3-3, 3-5-2, or 4-2-3-1.");
        return;
    }

    // Check for total outfield players (should be 10, excluding the goalkeeper)
    if (formation.reduce((acc, val) => acc + val, 0) !== 10) {
        alert("Invalid formation. The total number of outfield players must be 10.");
        return;
    }

    // Fetch the player data from the backend
    const parsedData = await fetchBestPlayers(formationInput);
    const playersDiv = document.getElementById("players");

    // Clear existing players
    playersDiv.innerHTML = '';

    // Calculate and display harmonic mean of player ratings
    updateHarmonicMean(parsedData);

    let defenders = formation[0];
    let defensiveMidfielders = formation.length === 5 ? formation[1] : 0;
    let midfielders = formation[Math.round(formation.length / 2) - 1];
    let attackingMidfielders = formation.length > 3 ? formation[formation.length - 2] : 0;
    let forwards = formation[formation.length - 1];

    // Add GK
    const gk = parsedData.find(player => player.Pos === 'GK');
    if (gk) {
        createPlayerElement(gk, '40.75%', '1%');
    }

    // Place defenders
    if (defenders > 3) {
        placeWingersandCentrals(
            parsedData, defenders, 'CB', '15%', defenders > 4 ? '27%' : '20%', 'B'
        );
    } else {
        // Place all defenders as central defenders (for formations with 3 or fewer defenders)
        placePlayers(parsedData, defenders, '15%', 'CB');
    }

    // Place defensive midfielders (DM)
    if (defensiveMidfielders > 0) {
        placePlayers(parsedData, defensiveMidfielders, '30%', 'DM');
    }

    // Place central midfielders (CM) with wide midfielders if more than 3
    if (midfielders > 3) {
        placeWingersandCentrals(parsedData, midfielders, 'CM', '45%', midfielders > 4 ? '58%' : '47%', 'M');
    } else {
        placePlayers(parsedData, midfielders, '44.25%', 'CM');
    }

    // Place attacking midfielders (AM) with wingers if more than 3
    if (attackingMidfielders > 2 && forwards < 3) {
        placeWingersandCentrals(parsedData, attackingMidfielders, 'AM', '60%', '62%', 'W');
    } else {
        placePlayers(parsedData, attackingMidfielders, '60%', 'AM');
    }

    // Place forwards (ST) with wingers if more than 2
    if (forwards > 2) {
        placeWingersandCentrals(parsedData, forwards, 'ST', '80%', '70%', 'W');
    } else {
        placePlayers(parsedData, forwards, '80%', 'ST');
    }
}

// Function to close all player cards and reset their z-index
function closeAllPlayerCards() {
    const allPlayers = document.querySelectorAll('.player');
    allPlayers.forEach(player => {
        player.classList.remove('expanded');
        player.style.zIndex = '2'; // Reset z-index for all players
    });
}

// Function to create a player element
function createPlayerElement(player, top, left) {
    const playersDiv = document.getElementById("players");

    const playerElement = document.createElement('div');
    playerElement.classList.add('player');
    playerElement.style.top = top;   // Use percentages
    playerElement.style.left = left; // Use percentages
    playerElement.style.zIndex = '2'; // Default z-index

    // Change background color for the player card based on the rating
    if (player.Rating >= 80) {
        playerElement.style.backgroundColor = '#ECD37C';
    } else if (player.Rating >= 70) {
        playerElement.style.backgroundColor = '#E5E5E5';
    } else {
        playerElement.style.backgroundColor = '#C89E72';
    }

    // Create a container for name, player-face, and rating
    const playerInfoContainer = document.createElement('div');
    playerInfoContainer.classList.add('player-info-container'); // Add the class here

    // Player name
    const playerName = document.createElement('div');
    playerName.classList.add('name');
    playerName.innerText = player.Name;

    // Player image
    const playerImg = document.createElement('img');
    playerImg.src = player.player_face_url;
    playerImg.alt = player.Name;
    playerImg.classList.add('player-face');
    playerImg.onerror = () => {
        playerImg.src = 'static/default.png'; // Default image URL
    };

    // Player rating
    const playerRating = document.createElement('div');
    playerRating.classList.add('rating');
    playerRating.innerText = Math.round(player.Rating);

    // Append name, image, and rating to the new container
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

// Function to place players based on their positions
function placePlayers(parsedData, count, xPos, role) {
    let centralCounter = 1;
    for (let i = 0; i < count; i++) {
        const player = parsedData.find(p => p.Pos === role + centralCounter);
        if (player) {
            const yPos = (i + 1) * (81.5 / (count + 1)) + '%';
            createPlayerElement(player, yPos, xPos);
            centralCounter++;
        }
    }
}

// Function to handle wide players
function placeWingersandCentrals(parsedData, set, Role, xPos, xPosW, end) {
    placePlayers(parsedData, set - 2, xPos, Role);
    createPlayerElement(parsedData.find(p => p.Pos === 'L' + end), '5%', xPosW);
    createPlayerElement(parsedData.find(p => p.Pos === 'R' + end), '78%', xPosW);
}

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
