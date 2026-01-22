
import React, { useState, useEffect } from 'react';

interface VoiceInputButtonProps {
    onResult: (text: string) => void;
    className?: string;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({ onResult, className = "" }) => {
    const [isListening, setIsListening] = useState(false);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setSupported(true);
        }
    }, []);

    const toggleListening = (e: React.MouseEvent) => {
        e.stopPropagation(); // Impede que o clique acione eventos no pai (ex: fechar acordeão)

        if (!supported) {
            alert("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.lang = 'pt-BR';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                onResult(transcript);
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                console.error('Erro no reconhecimento de voz:', event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    alert("Permissão de microfone negada. Por favor, ative nas configurações do navegador.");
                } else if (event.error === 'network') {
                    alert("Erro de rede. Verifique sua conexão.");
                }
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.start();
        } catch (err) {
            console.error('Falha ao iniciar reconhecimento de voz:', err);
            setIsListening(false);
            alert("Erro ao iniciar o microfone.");
        }
    };

    if (!supported) return null;

    return (
        <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center justify-center p-2 rounded-xl transition-all active:scale-90 ${isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200'
                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                } ${className}`}
            title={isListening ? "Ouvindo... Clique para parar" : "Ditar com a voz"}
        >
            <span className="material-symbols-outlined text-[18px]">
                {isListening ? 'mic' : 'mic_none'}
            </span>
        </button>
    );
};

export default VoiceInputButton;
