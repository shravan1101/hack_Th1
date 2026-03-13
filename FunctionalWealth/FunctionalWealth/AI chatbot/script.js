const DOM = {
    navItems: document.querySelectorAll('.nav-item'),
    sections: document.querySelectorAll('.view-section'),
    chatbox: document.getElementById('chatbox'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    micBtn: document.getElementById('micBtn'),
    startBreatheBtn: document.getElementById('startBreatheBtn'),
    breathingCircle: document.querySelector('.breathing-circle'),
    breatheText: document.getElementById('breatheText')
};

// --- State ---
let STATE = {
    apiKey: import.meta.env.GEMINI_API_KEY || '',
    elevenLabsKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
    // Use a pre-made ElevenLabs voice ID (e.g. Rachel or a calming voice)
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', 
    history: [],
    isBreathing: false,
    breatheInterval: null,
    isRecording: false
};

// --- System Prompt ---
const SYSTEM_PROMPT = `You are Aurora, an empathetic, non-judgmental AI companion designed to provide emotional support and mental health assistance. 

Rules:
1. Always respond with empathy, warmth, and validation.
2. Keep your responses concise and conversational (1-3 short paragraphs).
3. Do NOT provide medical diagnoses or prescribe treatments.
4. If a user expresses severe distress, thoughts of self-harm, or suicide, YOU MUST immediately and gently recommend they reach out to professional help or a crisis line, providing contact options. Be extremely cautious and supportive.
5. You can guide users through basic grounding exercises (e.g., 5-4-3-2-1 method) if they seem anxious.
6. Use simple formatting (bolding key phrases, maybe occasional emojis) to feel approachable but professional.`;

// --- Navigation ---
DOM.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active nav
        DOM.navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update active section
        const targetId = item.getAttribute('data-target') + 'View';
        DOM.sections.forEach(section => {
            if (section.id === targetId) {
                section.classList.remove('hidden');
                // Trigger reflow for animation
                void section.offsetWidth; 
                section.classList.add('active');
            } else {
                section.classList.remove('active');
                setTimeout(() => {
                    if (!section.classList.contains('active')) {
                        section.classList.add('hidden');
                    }
                }, 400); // match CSS transition
            }
        });

        // Stop breathing exercise if switching away
        if (targetId !== 'breatheView' && STATE.isBreathing) {
            stopBreathingExercise();
        }
    });
});

// --- Speech to Text (Web Speech API) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        STATE.isRecording = true;
        DOM.micBtn.classList.add('recording');
        DOM.userInput.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        DOM.userInput.value = transcript;
        // Auto send after speaking
        handleSend();
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        stopRecordingUI();
    };

    recognition.onend = () => {
        stopRecordingUI();
    };
} else {
    console.warn("Speech Recognition API not supported in this browser.");
    DOM.micBtn.style.display = 'none'; // Hide if not supported
}

function stopRecordingUI() {
    STATE.isRecording = false;
    DOM.micBtn.classList.remove('recording');
    DOM.userInput.placeholder = "Type or speak your message here...";
}

DOM.micBtn.addEventListener('click', () => {
    if (!recognition) return;
    
    if (STATE.isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
});

// --- Text to Speech (ElevenLabs API) ---
async function playElevenLabsAudio(text) {
    if (!STATE.elevenLabsKey) {
        console.warn("No ElevenLabs API Key provided. Skipping TTS.");
        return;
    }

    // Clean text of markdown before sending to TTS for better pronunciation
    const cleanText = text.replace(/[*_#`]/g, '');

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${STATE.elevenLabsVoiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': STATE.elevenLabsKey
            },
            body: JSON.stringify({
                text: cleanText,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs Error: ${response.status}`);
        }

        const blurBlob = await response.blob();
        const audioUrl = URL.createObjectURL(blurBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    } catch (error) {
        console.error("Failed to generate TTS:", error);
    }
}

// --- Chat Functionality ---

function createMessageElement(content, isUser) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const icon = isUser ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-leaf"></i>';
    
    let formattedContent = isUser ? content : marked.parse(content);
    // basic sanitize for user input
    if (isUser) {
        formattedContent = `<p>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
    }


    msgDiv.innerHTML = `
        <div class="message-avatar">
            ${icon}
        </div>
        <div class="message-content">
            ${formattedContent}
        </div>
    `;
    return msgDiv;
}

function showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message bot-message typing-msg`;
    msgDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fa-solid fa-leaf"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    DOM.chatbox.appendChild(msgDiv);
    DOM.chatbox.scrollTop = DOM.chatbox.scrollHeight;
    return msgDiv;
}

function removeTypingIndicator() {
    const typingMsg = document.querySelector('.typing-msg');
    if (typingMsg) typingMsg.remove();
}

async function fetchGeminiResponse(userText) {
    if (!STATE.apiKey) {
        return "Please configure your Gemini API Key in the settings first.";
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${STATE.apiKey}`;
        
        // Build payload with history
        const contents = [];
        
        // Inject system prompt into first message or maintain context
        let currentHistory = [...STATE.history];
        
        // Simplified approach for system prompt: Prepend to history context
        // Note: For production Gemini API, SystemInstructions field is better, 
        // but for basic restful fetch this works well enough.
        
        const payload = {
            system_instruction: {
                parts: { text: SYSTEM_PROMPT }
            },
            contents: [
                ...currentHistory,
                { role: "user", parts: [{ text: userText }] }
            ],
            generationConfig: {
                temperature: 0.7, // Slightly creative but grounded
                maxOutputTokens: 800,
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            return `I'm having trouble connecting right now (Error: ${response.status}). Please check your API key or network.`;
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            const replyText = data.candidates[0].content.parts[0].text;
            
            // Update history
            STATE.history.push({ role: "user", parts: [{ text: userText }] });
            STATE.history.push({ role: "model", parts: [{ text: replyText }] });
            
            // Keep history manageable (last 10 interactions = 20 messages)
            if (STATE.history.length > 20) {
                STATE.history = STATE.history.slice(STATE.history.length - 20);
            }

            return replyText;
        } else {
            return "I couldn't process that response. Can we try again?";
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        return "I'm having trouble connecting to my servers right now. Please assure your internet connection is stable.";
    }
}

const STRESS_KEYWORDS = [
    "die", "kill myself", "suicide", "end it all", "can't take it", 
    "overwhelmed", "hopeless", "hurt myself", "pain", "give up"
];

function detectStress(text) {
    const lowerText = text.toLowerCase();
    return STRESS_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function showEmergencyBanner() {
    const banner = document.createElement('div');
    banner.className = 'message bot-message';
    banner.innerHTML = `
        <div class="message-avatar" style="color: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);">
            <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div class="message-content" style="border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.1);">
            <p><strong>It sounds like you're going through a really tough time.</strong></p>
            <p>Please remember you don't have to face this alone. If you are in immediate danger, please call Ambulance <strong>108</strong>, Police <strong>100</strong>, or reach out to the <strong>Aasra Helpline at 9820466726</strong>.</p>
            <p>You can also check the <a href="#" onclick="document.querySelector('[data-target=\\'resources\\']').click(); return false;" style="color: var(--primary);">Resources</a> tab for more options.</p>
        </div>
    `;
    DOM.chatbox.appendChild(banner);
    DOM.chatbox.scrollTop = DOM.chatbox.scrollHeight;
}

async function handleSend() {
    const text = DOM.userInput.value.trim();
    if (!text) return;

    // 1. Add User Message
    DOM.chatbox.appendChild(createMessageElement(text, true));
    DOM.userInput.value = '';
    DOM.userInput.style.height = 'auto'; // reset height
    DOM.chatbox.scrollTop = DOM.chatbox.scrollHeight;

    // Emergency Detection
    if (detectStress(text)) {
        showEmergencyBanner();
    }

    // 2. Add Typing Indicator
    showTypingIndicator();

    // 3. Fetch Response
    const response = await fetchGeminiResponse(text);

    // 4. Remove Typing, Add Bot Message
    removeTypingIndicator();
    DOM.chatbox.appendChild(createMessageElement(response, false));
    DOM.chatbox.scrollTop = DOM.chatbox.scrollHeight;

    // 5. Play Audio
    playElevenLabsAudio(response);
}

DOM.sendBtn.addEventListener('click', handleSend);

DOM.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Auto-resize textarea
DOM.userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// --- Breathing Exercise ---
const BREATHE_PHASES = {
    INHALE: { text: "Inhale...", class: "breathe-inhale", duration: 4000 },
    HOLD1: { text: "Hold...", class: "breathe-hold", duration: 4000 },
    EXHALE: { text: "Exhale...", class: "breathe-exhale", duration: 6000 },
    HOLD2: { text: "Hold...", class: "breathe-hold", duration: 2000 }
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBreathingCycle() {
    if (!STATE.isBreathing) return;

    // Phase 1: Inhale
    DOM.breatheText.textContent = BREATHE_PHASES.INHALE.text;
    DOM.breathingCircle.className = `breathing-circle ${BREATHE_PHASES.INHALE.class}`;
    await sleep(BREATHE_PHASES.INHALE.duration);
    if (!STATE.isBreathing) return;

    // Phase 2: Hold
    DOM.breatheText.textContent = BREATHE_PHASES.HOLD1.text;
    DOM.breathingCircle.className = `breathing-circle ${BREATHE_PHASES.HOLD1.class}`;
    await sleep(BREATHE_PHASES.HOLD1.duration);
    if (!STATE.isBreathing) return;

    // Phase 3: Exhale
    DOM.breatheText.textContent = BREATHE_PHASES.EXHALE.text;
    DOM.breathingCircle.className = `breathing-circle ${BREATHE_PHASES.EXHALE.class}`;
    await sleep(BREATHE_PHASES.EXHALE.duration);
    if (!STATE.isBreathing) return;

    // Phase 4: Hold
    DOM.breatheText.textContent = BREATHE_PHASES.HOLD2.text;
    DOM.breathingCircle.className = `breathing-circle ${BREATHE_PHASES.HOLD2.class}`;
    await sleep(BREATHE_PHASES.HOLD2.duration);
    
    // Loop
    if (STATE.isBreathing) {
        runBreathingCycle();
    }
}

function startBreathingExercise() {
    STATE.isBreathing = true;
    DOM.startBreatheBtn.textContent = "Stop Exercise";
    DOM.startBreatheBtn.classList.replace('primary-btn', 'action-btn'); // visual change
    runBreathingCycle();
}

function stopBreathingExercise() {
    STATE.isBreathing = false;
    DOM.startBreatheBtn.textContent = "Start Exercise";
    DOM.startBreatheBtn.classList.replace('action-btn', 'primary-btn');
    DOM.breatheText.textContent = "Breathe";
    DOM.breathingCircle.className = 'breathing-circle'; // reset classes
}

DOM.startBreatheBtn.addEventListener('click', () => {
    if (STATE.isBreathing) {
        stopBreathingExercise();
    } else {
        startBreathingExercise();
    }
});
