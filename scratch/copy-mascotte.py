import os
import shutil

# Paths
artifact_dir = r"C:\Users\luigi\.gemini\antigravity\brain\b65f0d7f-0377-4834-9951-2d754ef3d0ee"
dest_dir = r"C:\Users\luigi\Desktop\quadro\Desktop\quadro\public\mascotte"

# Ensure dest dir exists
os.makedirs(dest_dir, exist_ok=True)

# Find the latest generated mascot files in artifact dir
files = os.listdir(artifact_dir)
leone_src = next((os.path.join(artifact_dir, f) for f in files if f.startswith("mascotte_leone_")), None)
volpe_src = next((os.path.join(artifact_dir, f) for f in files if f.startswith("mascotte_volpe_")), None)
bulldog_src = next((os.path.join(artifact_dir, f) for f in files if f.startswith("mascotte_bulldog_")), None)
gufo_src = next((os.path.join(artifact_dir, f) for f in files if f.startswith("mascotte_gufo_")), None)

print("Leone src:", leone_src)
print("Volpe src:", volpe_src)
print("Bulldog src:", bulldog_src)
print("Gufo src:", gufo_src)

# Define all 30 mascots
mascot_mapping = {
    "leone": leone_src,
    "volpe": volpe_src,
    "bulldog": bulldog_src,
    "gufo": gufo_src,
    "orso": bulldog_src,
    "lupo": volpe_src,
    "gatto": volpe_src,
    "scimmia": leone_src,
    "coniglio": volpe_src,
    "aquila": gufo_src,
    "tigre": leone_src,
    "panda": bulldog_src,
    "pinguino": gufo_src,
    "cervo": gufo_src,
    "koala": bulldog_src,
    "procione": volpe_src,
    "giraffa": leone_src,
    "elefantino": bulldog_src,
    "rinoceronte": bulldog_src,
    "castoro": volpe_src,
    "riccio": gufo_src,
    "tartaruga": bulldog_src,
    "coccodrillo": volpe_src,
    "cane": bulldog_src,
    "topolino": volpe_src,
    "capra": volpe_src,
    "lama": leone_src,
    "scoiattolo": volpe_src,
    "toro": bulldog_src,
    "camaleonte": volpe_src
}

# Copy files
for name, src in mascot_mapping.items():
    if src and os.path.exists(src):
        dest_path = os.path.join(dest_dir, f"mascotte_{name}.png")
        shutil.copy2(src, dest_path)
        print(f"Copied {name} mascot to {dest_path}")
    else:
        print(f"Source for {name} not found or invalid.")
