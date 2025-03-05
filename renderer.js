const { ipcRenderer } = require('electron');

async function searchArtist() {
    const resultsDiv = document.getElementById('results');

    // Cancel any ongoing search first
    await ipcRenderer.invoke('cancel-search');

    // Small delay to ensure cancel actually processes before starting a new search
    await new Promise(resolve => setTimeout(resolve, 100));

    resultsDiv.innerHTML = '<p class="text-gray-400">🔍 Searching for an underground artist...</p>';

    const genre = document.getElementById('genre-search').value; // Use search input instead of dropdown
    const followers = document.getElementById('followers-select').value;

    try {
        const artist = await ipcRenderer.invoke('search-random-artist', { genre, followers });

        if (!artist) {
            resultsDiv.innerHTML = '<p class="text-red-500">⚠️ No underground artists found. Try again.</p>';
            return;
        }

        resultsDiv.innerHTML = `
            <div class="flex flex-col items-center space-y-4 mt-4">
                <img src="${artist.image}" alt="${artist.name}" class="w-40 h-40 rounded-full shadow-lg">
                <h2 class="text-2xl font-semibold">${artist.name}</h2>
                <p class="text-gray-400">${artist.genre}</p>
                <p class="text-sm text-gray-500">Followers: ${artist.followers} | Popularity: ${artist.popularity}</p>
                <a href="spotify:artist:${artist.url.split('/').pop()}" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition duration-300">
                    🎵 Open in Spotify App
                </a>
                <a href="${artist.url}" target="_blank" class="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition duration-300">
                    🌐 Open in Browser
                </a>
            </div>
        `;
    } catch (error) {
        console.error("❌ Error fetching artist:", error);
        resultsDiv.innerHTML = '<p class="text-red-500">❌ Error fetching artist. Try again.</p>';
    }
}

// Attach event listener to button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search-btn').addEventListener('click', searchArtist);
});

document.addEventListener("DOMContentLoaded", async () => {
    const genreSelect = document.getElementById("genre-select");

    try {
        const genres = await ipcRenderer.invoke("getGenres");

        genres.forEach(genre => {
            const option = document.createElement("option");
            option.value = genre;
            option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
            genreSelect.appendChild(option);
        });
    } catch (error) {
        console.error("❌ Error fetching genres:", error);
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    const genreSearch = document.getElementById("genre-search");
    const genreDropdown = document.getElementById("genre-dropdown");

    try {
        const genres = await ipcRenderer.invoke("getGenres");

        function populateDropdown() {
            genreDropdown.innerHTML = "";
            genres.forEach(genre => {
                const option = document.createElement("div");
                option.className = "p-2 text-white hover:bg-green-600 cursor-pointer";
                option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
                option.onclick = () => selectGenre(genre);
                genreDropdown.appendChild(option);
            });
        }

        function filterGenres() {
            const searchValue = genreSearch.value.toLowerCase();
            const options = genreDropdown.children;
            for (let option of options) {
                option.style.display = option.textContent.toLowerCase().includes(searchValue) ? "block" : "none";
            }
            toggleDropdown(true); // Keep dropdown open while typing
        }

        function selectGenre(genre) {
            genreSearch.value = genre;
            toggleDropdown(false);
        }

        function toggleDropdown(show) {
            genreDropdown.classList.toggle("hidden", !show);
        }

        // Populate dropdown on load
        populateDropdown();

        // Keep dropdown open while typing
        genreSearch.addEventListener("input", filterGenres);

        // Prevent dropdown from closing when clicking inside it
        genreSearch.addEventListener("focus", () => toggleDropdown(true));

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!genreSearch.contains(e.target) && !genreDropdown.contains(e.target)) {
                toggleDropdown(false);
            }
        });

    } catch (error) {
        console.error("❌ Error fetching genres:", error);
    }
});