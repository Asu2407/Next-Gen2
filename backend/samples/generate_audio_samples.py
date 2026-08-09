import wave
import struct
import math
import os

SAMPLES = {
    "sample_assamese.wav": {
        "freq": 440.0,
        "marker": b"ASSAMESE_SAMPLE_SILCHAR_PREGNANT_INFANT_RISING_WATER"
    },
    "sample_bengali.wav": {
        "freq": 554.37,
        "marker": b"BENGALI_SAMPLE_KARIMGANJ_ELDERLY_DIALYSIS_PATIENT"
    },
    "sample_hindi.wav": {
        "freq": 659.25,
        "marker": b"HINDI_SAMPLE_GUWAHATI_5_STRANDED_ROOF_FOOD_SHORTAGE"
    },
    "sample_english.wav": {
        "freq": 880.0,
        "marker": b"ENGLISH_SAMPLE_KAZIRANGA_EMBANKMENT_ROUTINE_MONITORING"
    }
}

def generate_sample_wav(filepath: str, freq: float, marker_bytes: bytes, duration_sec: float = 2.0):
    sample_rate = 16000
    num_samples = int(sample_rate * duration_sec)
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with wave.open(filepath, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        frames = bytearray()
        # Insert metadata marker near header for test identification
        frames.extend(marker_bytes.ljust(128, b'\x00'))
        
        # Audio tone synthesis
        for i in range(128, num_samples):
            t = float(i) / sample_rate
            # Dual frequency modulation for voice-like acoustic wave simulation
            value = int(16000 * (0.6 * math.sin(2 * math.pi * freq * t) + 0.4 * math.sin(2 * math.pi * (freq * 1.5) * t)))
            frames.extend(struct.pack('<h', max(-32768, min(32767, value))))
            
        wav_file.writeframes(bytes(frames))
    print(f"Generated sample audio: {filepath} ({len(frames)} bytes)")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for name, config in SAMPLES.items():
        out_path = os.path.join(script_dir, name)
        generate_sample_wav(out_path, config["freq"], config["marker"])
