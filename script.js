// CONFIGURACIÓN CENTRAL DE LA API (TMDB)
const API_KEY = '3b16c961cf16815cd9f77b43e5bb74e5';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

// Estado global interno del Navegador
let miLista = JSON.parse(localStorage.getItem('streamBox_lista')) || [];
let peliculaDestacadaActual = null;

// Elementos Estructurales del DOM
const contenedorPeliculas = document.getElementById('contenedor-peliculas');
const contenedorSeries = document.getElementById('contenedor-series');
const contenedorMiLista = document.getElementById('contenedor-mi-lista');
const seccionMiListaBloque = document.getElementById('seccion-mi-lista-bloque');
const inputBuscador = document.getElementById('input-buscador');

// Elementos de la Ventana Emergente (Modal)
const modal = document.getElementById('modal-detalle');
const modalBanner = document.getElementById('modal-banner');
const modalRating = document.getElementById('modal-rating');
const modalAño = document.getElementById('modal-año');
const modalExtra = document.getElementById('modal-extra');
const modalSinopsis = document.getElementById('modal-sinopsis');
const modalInfoTitulo = document.getElementById('modal-info-titulo');
const modalInfoGenero = document.getElementById('modal-info-genero');
const modalInfoTipo = document.getElementById('modal-info-tipo');
const modalBtnReproducir = document.getElementById('modal-btn-reproducir');
const btnMonetizarAfiliado = document.getElementById('btn-monetizar-afiliado');
const videoOverlay = document.getElementById('video-overlay-player');
const contenedorIframe = document.getElementById('contenedor-iframe-interno');

// Animación dinámica al hacer Scroll en la cabecera
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Inicialización del ecosistema al terminar la carga
document.addEventListener('DOMContentLoaded', () => {
    cargarContenidoInicial();
    configurarBuscador();
    actualizarVistaMiLista();
});

// Consumo asíncrono del Catálogo API
async function cargarContenidoInicial() {
    try {
        // Consultas paralelas para optimizar tiempos de respuesta
        const [resPeliculas, resSeries] = await Promise.all([
            fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=es-ES&page=1`),
            fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}&language=es-ES&page=1`)
        ]);

        const dataPeliculas = await resPeliculas.json();
        const dataSeries = await resSeries.json();

        // Configuración de la sección Hero Principal
        if (dataPeliculas.results && dataPeliculas.results.length > 0) {
            configurarHeroBanner(dataPeliculas.results[2]); // Tomamos el índice 2 para variedad visual
        }

        // Renderizado en las vitrinas deslizantes de la interfaz
        renderizarFila(dataPeliculas.results, contenedorPeliculas, 'movie');
        renderizarFila(dataSeries.results, contenedorSeries, 'tv');

    } catch (error) {
        console.error("Error en la sincronización con el servidor de medios:", error);
    }
}

// Inicialización del Banner Principal Superior
function configurarHeroBanner(item) {
    peliculaDestacadaActual = item;
    const banner = document.getElementById('hero-banner');
    banner.style.backgroundImage = `url('${BACKDROP_URL}${item.backdrop_path}')`;
    
    document.getElementById('hero-titulo').textContent = item.title || item.name;
    document.getElementById('hero-rating').textContent = `${Math.round(item.vote_average * 10)}% de coincidencia`;
    document.getElementById('hero-año').textContent = new Date(item.release_date || item.first_air_date).getFullYear();
    document.getElementById('hero-descripcion').textContent = item.overview ? item.overview.substring(0, 180) + '...' : 'Sin sinopsis disponible actualmente.';

    document.getElementById('hero-btn-play').onclick = () => abrirModalDetalle(item.id, 'movie');
    document.getElementById('hero-btn-votar').onclick = (e) => {
        alert("¡Añadido a tus preferencias!");
    };
}

// Renderizador Dinámico de Tarjetas Premium
function renderizarFila(items, contenedor, tipo) {
    contenedor.innerHTML = '';
    if (!items || items.length === 0) {
        contenedor.innerHTML = '<p style="color: var(--text-muted); padding-left: 20px;">No se encontraron títulos disponibles.</p>';
        return;
    }

    items.forEach(item => {
        if (!item.poster_path) return;

        const card = document.createElement('div');
        card.className = 'movie-card';
        
        const estaEnLista = miLista.some(fav => fav.id === item.id);
        const botonTexto = estaEnLista ? '<i class="fa-solid fa-check"></i> En mi lista' : '<i class="fa-solid fa-plus"></i> Mi Lista';
        const botonClase = estaEnLista ? 'btn-votar-tarjeta en-lista' : 'btn-votar-tarjeta';
        
        // Determinamos el tipo de medio exacto de forma segura
        const tipoElemento = item.media_type || tipo;

        card.innerHTML = `
            <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" onclick="abrirModalDetalle(${item.id}, '${tipoElemento}')" loading="lazy">
            <div class="card-metadata">
                <div class="card-title" onclick="abrirModalDetalle(${item.id}, '${tipoElemento}')">${item.title || item.name}</div>
                <div class="card-sub-row">
                    <span class="card-badge">${new Date(item.release_date || item.first_air_date).getFullYear() || 'N/A'}</span>
                    <span class="card-badge" style="color: #10b981; font-weight: bold;">★ ${item.vote_average.toFixed(1)}</span>
                </div>
                <button class="${botonClase}" data-id="${item.id}">
                    ${botonTexto}
                </button>
            </div>
        `;

        // Asignamos el evento de guardar de manera estructurada y limpia
        card.querySelector('.btn-votar-tarjeta').addEventListener('click', (e) => {
            e.stopPropagation();
            alternarMiLista(item, tipoElemento);
        });

        contenedor.appendChild(card);
    });
}

// Control de apertura de Detalles en Modal
async function abrirModalDetalle(id, tipo) {
    try {
        const res = await fetch(`${BASE_URL}/${tipo}/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=videos`);
        const item = await res.json();

        modalBanner.style.backgroundImage = `url('${BACKDROP_URL}${item.backdrop_path || item.poster_path}')`;
        modalRating.textContent = `${Math.round(item.vote_average * 10)}% de coincidencia`;
        modalAño.textContent = new Date(item.release_date || item.first_air_date).getFullYear();
        modalExtra.textContent = tipo === 'movie' ? `${item.runtime || 0} min` : `${item.number_of_seasons || 0} Temp`;
        modalSinopsis.textContent = item.overview || "Sin descripción en español registrada en el servidor central.";
        activarReproductorMagis(id, tipo);        modalInfoTitulo.textContent = item.original_title || item.original_name;
        modalInfoGenero.textContent = item.genres ? item.genres.map(g => g.name).join(', ') : 'Drama';
        modalInfoTipo.textContent = tipo === 'movie' ? 'Película' : 'Serie de TV';

        // LÓGICA DE MONETIZACIÓN DIRECTA (Estrategia de afiliados basada en intención de búsqueda)
        const queryComercial = encodeURIComponent(item.title || item.name);
        btnMonetizarAfiliado.href = `https://www.justwatch.com/es/buscar?q=${queryComercial}`;

        // Obtención de recursos multimedia (Tráiler de YouTube)
        const videos = item.videos?.results || [];
        const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videos[0];

        if (trailer) {
            modalBtnReproducir.style.display = 'flex';
            modalBtnReproducir.onclick = () => activarReproductorMagis(id, tipo);
        } else {
            modalBtnReproducir.style.display = 'none';
        }

        modal.style.display = 'flex';
    } catch (error) {
        console.error("Error cargando los detalles del título seleccionado:", error);
    }
}

function cerrarModalDetalle() {
    modal.style.display = 'none';
    detenerVideoInterno();
    detenerReproductorMagis();}

// Reproductor de Video Embebido Integrado
function reproducirVideo(youtubeKey) {
    contenedorIframe.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${youtubeKey}?autoplay=1&modestbranding=1&rel=0" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen 
                style="width:100%; height:100%;">
        </iframe>`;
    videoOverlay.style.display = 'block';
}

function detenerVideoInterno() {
    contenedorIframe.innerHTML = '';
    videoOverlay.style.display = 'none';
}

// Controlador de Persistencia para "Mi Lista"
function alternarMiLista(item, tipo) {
    const index = miLista.findIndex(fav => fav.id === item.id);
    if (index > -1) {
        miLista.splice(index, 1);
    } else {
        item.media_type = tipo; 
        miLista.push(item);
    }

    localStorage.setItem('streamBox_lista', JSON.stringify(miLista));
    actualizarVistaMiLista();
    cargarContenidoInicial(); 
}

function actualizarVistaMiLista() {
    if (miLista.length === 0) {
        seccionMiListaBloque.style.display = 'none';
    } else {
        seccionMiListaBloque.style.display = 'block';
        renderizarFila(miLista, contenedorMiLista, 'movie');
    }
}

// Motor de Motor de Búsqueda Reactivo (Debounce Integrado)
function configurarBuscador() {
    let filtroTemporal = null;

    inputBuscador.addEventListener('input', (e) => {
        clearTimeout(filtroTemporal);
        const query = e.target.value.trim();

        if (query.length < 3) {
            if (query.length === 0) {
                document.querySelector('#seccion-peliculas-bloque .section-title').textContent = "Películas Recomendadas";
                document.getElementById('seccion-series-bloque').style.display = 'block';
                cargarContenidoInicial();
            }
            return;
        }

        // Retraso controlado para no saturar tu cuota diaria en la API
        filtroTemporal = setTimeout(async () => {
            try {
                const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=1`);
                const data = await res.json();
                
                const resultadosValidos = data.results.filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
                
                document.querySelector('#seccion-peliculas-bloque .section-title').textContent = `Resultados para: "${query}"`;
                renderizarFila(resultadosValidos, contenedorPeliculas, 'movie');
                
                document.getElementById('seccion-series-bloque').style.display = 'none';
            } catch (error) {
                console.error("Error en la ejecución de búsqueda:", error);
            }
        }, 400);
    });
}
// Asegúrate de que este código esté al final de tu script.js
function activarReproductorMagis(id, tipo = 'movie') {
    const contenedorRepro = document.getElementById('contenedor-reproductor');
    const iframeRepro = document.getElementById('reproductor-video');
    
    if (contenedorRepro && iframeRepro) {
        // Servidor embed alternativo y muy estable
iframeRepro.src = `https://player.autoembed.to/${tipo}/${id}`;
        // Mostramos el contenedor del reproductor
        contenedorRepro.style.display = 'block';
    }
}

function detenerReproductorMagis() {
    const contenedorRepro = document.getElementById('contenedor-reproductor');
    const iframeRepro = document.getElementById('reproductor-video');
    
    if (contenedorRepro && iframeRepro) {
        iframeRepro.src = ''; 
        contenedorRepro.style.display = 'none'; 
    }
}
