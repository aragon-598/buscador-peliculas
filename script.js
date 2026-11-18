const movieInput = document.getElementById("movie-input");
const searchBtn = document.getElementById("search-btn");
const statusText = document.getElementById("status");
const resultsContainer = document.getElementById("results");
const OMDB_API_KEY = "6c5ff00d";
const OMDB_API_URL = "https://www.omdbapi.com/";

function getYear(movie) {
	return movie.Year && movie.Year !== "N/A" ? movie.Year : "No disponible";
}

function cleanSummary(movie) {
	return movie.Plot && movie.Plot !== "N/A" ? movie.Plot : "Sinopsis no disponible.";
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => {
		const entities = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return entities[character];
	});
}

function renderMovies(movies) {
	const cardsHtml = movies
		.map((movie) => {
			const title = movie.Title || "Título no disponible";
			const year = getYear(movie);
			const summary = cleanSummary(movie);
			const image = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : "";

			return `
				<div class="col-12 col-sm-6 col-lg-4">
					<article class="movie-item p-3">
						${
							image
								? `<img class="movie-poster mb-3" src="${escapeHtml(image)}" alt="Poster de ${escapeHtml(title)}">`
								: `<div class="movie-poster mb-3 d-flex align-items-center justify-content-center text-muted">Sin imagen</div>`
						}
						<h2 class="h6 mb-2">${escapeHtml(title)}</h2>
						<p class="mb-1"><strong>Año:</strong> ${year}</p>
						<p class="movie-summary mb-0"><strong>Sinopsis:</strong> ${escapeHtml(summary)}</p>
					</article>
				</div>
			`;
		})
		.join("");

	resultsContainer.innerHTML = cardsHtml;
}

function buildApiUrl(parameters) {
	const url = new URL(OMDB_API_URL);
	url.search = new URLSearchParams({ apikey: OMDB_API_KEY, ...parameters });
	return url;
}

async function getMovieDetails(movie) {
	try {
		const url = buildApiUrl({ i: movie.imdbID, plot: "full" });
		const response = await fetch(url);
		if (!response.ok) {
			return movie;
		}

		const details = await response.json();
		return details.Response === "True" ? details : movie;
	} catch {
		return movie;
	}
}

function showMessage(message) {
	statusText.textContent = message;
}

async function searchMovies() {
	const query = movieInput.value.trim();

	if (!query) {
		showMessage("Escribe una película para buscar.");
		resultsContainer.innerHTML = "";
		return;
	}

	showMessage("Buscando...");
	resultsContainer.innerHTML = "";

	try {
		const response = await fetch(buildApiUrl({ s: query, type: "movie", page: "1" }));

		if (!response.ok) {
			throw new Error("La API no respondió correctamente.");
		}

		const data = await response.json();
		if (data.Response === "False") {
			if (data.Error === "Invalid API key!") {
				throw new Error("La clave de OMDb no es válida.");
			}
			if (data.Error === "Movie not found!") {
				showMessage("Película no encontrada.");
				return;
			}
			if (data.Error === "Request limit reached!") {
				throw new Error("Se alcanzó el límite de consultas de OMDb.");
			}
			throw new Error(data.Error || "OMDb no pudo completar la búsqueda.");
		}

		const searchResults = data.Search || [];
		if (searchResults.length === 0) {
			showMessage("Película no encontrada.");
			return;
		}

		const visibleMovies = await Promise.all(searchResults.map(getMovieDetails));
		showMessage(`Se encontraron ${visibleMovies.length} resultado(s).`);
		renderMovies(visibleMovies);
	} catch (error) {
		const message = error instanceof TypeError
			? "Error de conexión al consultar OMDb. Intenta nuevamente más tarde."
			: error.message || "Error al consultar la información. Intenta nuevamente más tarde.";
		showMessage(message);
		resultsContainer.innerHTML = "";
	}
}

searchBtn.addEventListener("click", () => {
	void searchMovies();
});

movieInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		void searchMovies();
	}
});
