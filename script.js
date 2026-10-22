// Referencias a los elementos del HTML
const usernameInput = document.getElementById('username');
const loadBtn = document.getElementById('load-btn');
const statusMsg = document.getElementById('status-msg');
const spinBtn = document.getElementById('spin-btn');
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');

const resultModal = document.getElementById('result-modal');
const movieTitleEl = document.getElementById('movie-title');
const movieLinkEl = document.getElementById('movie-link');

// Variables globales para la ruleta
let movies = [];
let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let spinAngleStart = 10;
let spinTime = 0;
let spinTimeTotal = 0;

// Paleta de colores estilo Letterboxd para las secciones de la ruleta
const colors = [
  '#00e054', // Verde Letterboxd
  '#1e252c', // Gris oscuro
  '#ff8000', // Naranja Letterboxd
  '#14181c', // Fondo ultra oscuro
  '#40bcf4', // Azul Letterboxd
  '#2c3440'  // Gris medio
];

// Event Listeners
loadBtn.addEventListener('click', fetchWatchlist);
spinBtn.addEventListener('click', spinWheel);

// 1. Obtener la Watchlist desde el Feed RSS de Letterboxd
async function fetchWatchlist() {
  const username = usernameInput.value.trim().toLowerCase();
  
  if (!username) {
    statusMsg.textContent = 'Por favor, introduce un nombre de usuario.';
    return;
  }

  statusMsg.textContent = 'Cargando películas de la Watchlist...';
  loadBtn.disabled = true;
  spinBtn.disabled = true;
  resultModal.classList.add('hidden');

  // URL del RSS de Letterboxd mediante un proxy CORS público para poder leer el XML directamente
  const rssUrl = `https://letterboxd.com/${username}/watchlist/rss/`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Error al conectar con la red.');
    
    const data = await response.json();
    
    if (!data.contents) {
      throw new Error('No se encontraron datos.');
    }

    // Parsear el XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
    const items = xmlDoc.querySelectorAll('item');

    movies = [];
    items.forEach(item => {
      const title = item.querySelector('letterboxd\\:filmTitle, filmTitle')?.textContent || item.querySelector('title')?.textContent;
      const link = item.querySelector('link')?.textContent;
      
      if (title) {
        movies.push({ title, link });
      }
    });

    if (movies.length === 0) {
      statusMsg.textContent = 'No se encontraron películas en la Watchlist o la lista es privada.';
      loadBtn.disabled = false;
      return;
    }

    // Mezclar el orden para dar variedad
    movies = movies.sort(() => Math.random() - 0.5);

    statusMsg.textContent = `¡Éxito! Se cargaron ${movies.length} películas.`;
    arc = (2 * Math.PI) / movies.length;
    
    drawRouletteWheel();
    spinBtn.disabled = false;

  } catch (error) {
    console.error(error);
    statusMsg.textContent = 'Error al cargar el usuario. Revisa el nombre o si la cuenta es pública.';
  } finally {
    loadBtn.disabled = false;
  }
}

// 2. Dibujar la Ruleta en el Canvas
function drawRouletteWheel() {
  if (movies.length === 0) return;

  const outsideRadius = 240;
  const textRadius = 160;
  const insideRadius = 40;

  ctx.clearRect(0, 0, 500, 500);

  ctx.strokeStyle = '#2c3440';
  ctx.lineWidth = 2;

  for (let i = 0; i < movies.length; i++) {
    const angle = startAngle + i * arc;
    ctx.fillStyle = colors[i % colors.length];

    // Dibujar el sector (quesito)
    ctx.beginPath();
    ctx.arc(250, 250, outsideRadius, angle, angle + arc, false);
    ctx.arc(250, 250, insideRadius, angle + arc, angle, true);
    ctx.stroke();
    ctx.fill();

    // Guardar el contexto para escribir el texto
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.translate(
      250 + Math.cos(angle + arc / 2) * textRadius,
      250 + Math.sin(angle + arc / 2) * textRadius
    );
    ctx.rotate(angle + arc / 2 + Math.PI / 2);
    
    // Acortar el título si es muy largo para que no sobresalga
    let text = movies[i].title;
    if (text.length > 20) {
      text = text.substring(0, 17) + '...';
    }
    
    ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
    ctx.restore();
  }
}

// 3. Lógica para hacer Girar la Ruleta
function spinWheel() {
  spinBtn.disabled = true;
  loadBtn.disabled = true;
  resultModal.classList.add('hidden');

  spinAngleStart = Math.random() * 10 + 10;
  spinTime = 0;
  spinTimeTotal = Math.random() * 3000 + 4000; // Girará entre 4 y 7 segundos
  
  rotateWheel();
}

function rotateWheel() {
  spinTime += 30;
  if (spinTime >= spinTimeTotal) {
    stopRotateWheel();
    return;
  }
  
  // Función de desaceleración (easeOut)
  const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
  startAngle += (spinAngle * Math.PI) / 180;
  
  drawRouletteWheel();
  spinTimeout = setTimeout(rotateWheel, 30);
}

function stopRotateWheel() {
  clearTimeout(spinTimeout);
  
  // Calcular cuál es el sector señalado por la flecha superior (en el ángulo 270 grados / 1.5 * PI)
  const degrees = (startAngle * 180) / Math.PI + 90;
  const arcd = (arc * 180) / Math.PI;
  const index = Math.floor((360 - (degrees % 360)) / arcd) % movies.length;

  const winner = movies[index];
  
  // Mostrar el resultado
  movieTitleEl.textContent = winner.title;
  movieLinkEl.href = winner.link || `https://letterboxd.com/search/${encodeURIComponent(winner.title)}`;
  resultModal.classList.remove('hidden');

  spinBtn.disabled = false;
  loadBtn.disabled = false;
}

// Función matemática de suavizado para el frenado
function easeOut(t, b, c, d) {
  const ts = (t /= d) * t;
  const tc = ts * t;
  return b + c * (tc + -3 * ts + 3 * t);
}
