import math
import struct
import os

def create_beep_wav(filename, frequency=1000, duration_sec=0.5, sample_rate=44100, volume=0.5):
    num_samples = int(duration_sec * sample_rate)
    
    # WAV Header fields
    num_channels = 1
    bits_per_sample = 16
    block_align = num_channels * (bits_per_sample // 8)
    byte_rate = sample_rate * block_align
    data_size = num_samples * block_align
    file_size = 36 + data_size
    
    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        file_size,
        b'WAVE',
        b'fmt ',
        16,              # format chunk size
        1,               # PCM format
        num_channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b'data',
        data_size
    )
    
    # Generate sine wave samples
    samples = bytearray()
    for i in range(num_samples):
        t = float(i) / sample_rate
        # Sine wave formula: volume * sin(2 * pi * f * t)
        val = int(volume * 32767.0 * math.sin(2.0 * math.pi * frequency * t))
        samples.extend(struct.pack('<h', val))
        
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(header)
        f.write(samples)
    print(f"Generated audio beep file at {filename}")

if __name__ == '__main__':
    target_path = r"C:\Users\luigi\Desktop\quadro\Desktop\quadro\public\suoni\notifica.mp3"
    create_beep_wav(target_path)
