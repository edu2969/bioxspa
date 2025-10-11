// /d:/git/bioxspa/app/utils/sounds.js

/**
 * Reproduce un sonido dado su URL.
 * @param {string} url - La URL del archivo de sonido.
 */
export default function reproducirSonido(url) {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(error => {
        // Opcional: puedes manejar el error aquí o lanzar uno
        console.error('Error al reproducir sonido:', error);
    });
}