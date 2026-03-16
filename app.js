document.addEventListener('DOMContentLoaded', () => {
    console.log('Fisioterapia Melros - Nexus Conectado');

    const nexusWidget = document.getElementById('nexus-widget');
    const closeBtn = document.getElementById('nexus-close');
    const sendBtn = document.querySelector('.nexus-send');
    const chatInput = document.querySelector('.nexus-footer input');
    const chatBody = document.querySelector('.nexus-body');

    // Habilitar el input que estaba disabled en el HTML
    if (chatInput) chatInput.disabled = false;

    // URL de tu Webhook de Make
    const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/ybe3wo4nuz4h23gqxwl3z28k5jwiuzfd';

    // Función para añadir mensajes a la interfaz
    const addMessage = (text, isUser = false) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = isUser ? 'nexus-message-bubble user-msg' : 'nexus-message-bubble';

        // Estilos rápidos para diferenciar usuario de bot
        if (isUser) {
            msgDiv.style.backgroundColor = '#007bff';
            msgDiv.style.color = '#ffffff';
            msgDiv.style.marginLeft = 'auto';
            msgDiv.style.borderTopRightRadius = '2px';
            msgDiv.style.borderTopLeftRadius = '12px';
        } else {
            msgDiv.style.backgroundColor = '#ffffff';
            msgDiv.style.color = '#333333';
            msgDiv.style.marginRight = 'auto';
        }

        msgDiv.style.padding = '12px 15px';
        msgDiv.style.borderRadius = '12px';
        msgDiv.style.marginBottom = '10px';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        msgDiv.style.fontSize = '0.9rem';
        msgDiv.style.lineHeight = '1.4';

        // INTERCEPTOR DE RESERVAS
        // Detecta si es un enlace de WhatsApp para convertirlo en un formulario
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

        if (!isUser && text.match(linkRegex)) {
            // Es un mensaje del bot con enlace
            const formattedText = text.replace(linkRegex, (match, label, url) => {
                // Si es un enlace de WhatsApp, mostramos el selector de fecha
                if (url.includes('wa.me')) {
                    return `
                        <div class="booking-widget">
                            <p style="margin-bottom:10px; font-weight:600; color:#2A9D8F;">📅 Personaliza tu cita:</p>
                            <input type="date" class="booking-date" min="${new Date().toISOString().split('T')[0]}">
                            <select class="booking-time">
                                <option value="">Hora preferida...</option>
                                <option value="Mañana (09:00 - 13:00)">Mañana (09:00 - 13:00)</option>
                                <option value="Tarde (15:00 - 20:00)">Tarde (15:00 - 20:00)</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="12:00">12:00</option>
                                <option value="17:00">17:00</option>
                                <option value="18:00">18:00</option>
                                <option value="19:00">19:00</option>
                            </select>
                            <button class="nexus-chat-btn confirm-booking" data-url="${url}" style="width:100%; text-align:center; margin-top:8px;">
                                <i class="fab fa-whatsapp"></i> Confirmar Cita
                            </button>
                        </div>
                    `;
                }
                // Enlace normal
                return `<a href="${url}" target="_blank" class="nexus-chat-btn">${label}</a>`;
            });
            msgDiv.innerHTML = formattedText;
        } else {
            msgDiv.textContent = text;
        }

        chatBody.appendChild(msgDiv);

        // Scroll automático al final
        chatBody.scrollTop = chatBody.scrollHeight;
        return msgDiv;
    };

    // DELEGACIÓN DE EVENTOS PARA EL FORMULARIO DE RESERVA (Ya que se crea dinámicamente)
    chatBody.addEventListener('click', (e) => {
        if (e.target.closest('.confirm-booking')) {
            const btn = e.target.closest('.confirm-booking');
            const container = btn.closest('.booking-widget');
            const dateInput = container.querySelector('.booking-date');
            const timeInput = container.querySelector('.booking-time');

            const date = dateInput.value;
            const time = timeInput.value;
            const originalUrl = btn.dataset.url;

            if (!date || !time) {
                alert('Por favor, selecciona qué día y hora te vienen mejor antes de continuar.');
                return;
            }

            // Formatear para URL
            const bookingText = `%20para%20el%20día%20${date}%20en%20horario%20de%20${time}`;
            const finalUrl = originalUrl + bookingText;

            // Feedback visual
            btn.innerHTML = '<i class="fas fa-check"></i> Abriendo WhatsApp...';
            btn.style.backgroundColor = '#21867a';

            // Abrir WhatsApp
            window.open(finalUrl, '_blank');
        }
    });

    // Función principal de envío
    const sendMessage = async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        // 1. Mostrar mensaje del usuario
        addMessage(message, true);
        chatInput.value = '';

        // 2. Mostrar indicador de "escribiendo..."
        const loadingMsg = addMessage('Nexus está pensando...');

        // LÓGICA DE RESPUESTA HÍBRIDA (Local + IA)
        // Si el usuario pregunta por precios o reservas, respondemos directamente para asegurar la venta.
        const lowerMsg = message.toLowerCase();
        const bookingKeywords = ['precio', 'cuesta', 'costo', 'vale', 'reservar', 'cita', 'agendar', 'contratar'];

        if (bookingKeywords.some(keyword => lowerMsg.includes(keyword))) {
            setTimeout(() => {
                loadingMsg.remove();
                // Usamos formato Markdown para que el sistema genere el botón
                const staticResponse = "La sesión es de 50€ e incluye una hora de tratamiento exclusivo. Puedes asegurar tu hueco pagando directamente aquí: [ASEGURAR HUECO (50€)](https://book.stripe.com/fZu28rbm7csQe0n7h8gnK00). Una vez hecho, te llamaremos de inmediato para elegir la hora que mejor te venga.";
                addMessage(staticResponse);
            }, 1000); // Pequeño delay para naturalidad
            return;
        }

        try {
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pregunta: message,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const textResponse = await response.text();
                // Eliminar mensaje de carga y poner la respuesta real
                loadingMsg.remove();
                addMessage(textResponse);
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('Error:', error);
            loadingMsg.textContent = 'Lo siento, ha habido un error en la conexión. Prueba de nuevo.';
        }
    };

    // Listeners de eventos
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // LÓGICA DE APERTURA / CIERRE
    const launcher = document.getElementById('nexus-launcher');

    // Función para alternar visibilidad
    const toggleWidget = () => {
        nexusWidget.classList.toggle('active');
        // Opcional: Cambiar icono del launcher si está abierto/cerrado
        const icon = launcher.querySelector('i');
        if (nexusWidget.classList.contains('active')) {
            icon.classList.remove('fa-comment-dots');
            icon.classList.add('fa-chevron-down');
        } else {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-comment-dots');
        }
    };

    // 1. Click en el Launcher (Botón Flotante)
    if (launcher) {
        launcher.addEventListener('click', toggleWidget);
    }

    // 2. Click en botón Cerrar (X) -> Solo minimiza
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            nexusWidget.classList.remove('active');
            // Restaurar icono original
            if (launcher) {
                const icon = launcher.querySelector('i');
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-comment-dots');
            }
        });
    }

    // Auto-apertura proactiva eliminada a petición del usuario
    // --- STRIPE CHECKOUT INTEGRATION ---
    const stripe = Stripe('pk_live_51MAXB3GDFfa30sCyu2hTAKLklBruJnvJg7KsecPQQTnBUvpil9U7yZp7vERtoMfwrT8N1No0hAVQumZCEZKpSP4t00YDjNWOog');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckout = document.getElementById('close-checkout');

    // Función para abrir el checkout
    async function openCheckout() {
        if (!checkoutModal) return;

        checkoutModal.classList.add('active');

        // Placeholder de carga inicial
        const checkoutDiv = document.getElementById('checkout');
        checkoutDiv.innerHTML = '<div style="text-align:center; padding:40px; color:#666;"><i class="fas fa-circle-notch fa-spin" style="font-size:2rem; color:#007bff;"></i><br><br>Conectando con Stripe...</div>';

        try {
            // 1. Pedir el secreto a Make
            const response = await fetch('https://hook.eu1.make.com/uxmet3sen981l6b5te9jrc2ubu0sp1kr', {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Error al conectar con el servidor de pagos');

            // Make devuelve el clientSecret en texto plano
            const clientSecret = await response.text();

            // 2. Montar Stripe
            const checkout = await stripe.initEmbeddedCheckout({
                clientSecret,
            });

            // 3. Pintarlo
            checkout.mount('#checkout');

        } catch (error) {
            console.error(error);
            checkoutDiv.innerHTML = '<div style="text-align:center; padding:20px; color:red;">Hubo un error al iniciar el pago. Si persiste, contáctanos por WhatsApp.</div>';
        }
    }

    // Event Listeners para los botones de "Reservar"
    // Usamos selectores específicos para NO afectar al botón del formulario de contacto
    const bookingBtns = document.querySelectorAll('.hero-btns .primary-btn, .cta-header, .service-link');

    bookingBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openCheckout();
        });
    });

    // Cerrar modal
    if (closeCheckout) {
        closeCheckout.addEventListener('click', () => {
            checkoutModal.classList.remove('active');
        });
    }
});
