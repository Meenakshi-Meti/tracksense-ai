"""
Create synthetic track images for training
No internet required!
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os
from pathlib import Path

print("\n" + "="*70)
print("CREATING SYNTHETIC TRACK IMAGES")
print("="*70 + "\n")

def create_dry_image():
    """Create a simulated DRY track image"""
    # Dark asphalt with some texture
    img = Image.new('RGB', (400, 300), color=(40, 40, 45))
    pixels = img.load()
    
    # Add texture noise
    for i in range(img.width):
        for j in range(img.height):
            noise = np.random.randint(-10, 10)
            r, g, b = 40 + noise, 40 + noise, 45 + noise
            pixels[i, j] = (max(0, min(255, r)), 
                           max(0, min(255, g)), 
                           max(0, min(255, b)))
    
    # Add road markings (white lines)
    draw = ImageDraw.Draw(img)
    draw.rectangle([80, 100, 320, 200], outline=(200, 200, 200), width=3)
    draw.line([200, 100, 200, 200], fill=(200, 200, 200), width=2)
    
    # Slightly blur
    img = img.filter(ImageFilter.GaussianBlur(radius=1))
    
    return img

def create_damp_image():
    """Create a simulated DAMP track image"""
    # Dark asphalt with slight moisture
    img = Image.new('RGB', (400, 300), color=(50, 50, 55))
    pixels = img.load()
    
    # Add texture with some wet spots
    for i in range(img.width):
        for j in range(img.height):
            noise = np.random.randint(-15, 15)
            # Slight sheen from moisture
            sheen = np.random.randint(0, 30) if np.random.random() > 0.7 else 0
            
            r, g, b = 50 + noise + sheen, 50 + noise + sheen, 55 + noise + sheen
            pixels[i, j] = (max(0, min(255, r)), 
                           max(0, min(255, g)), 
                           max(0, min(255, b)))
    
    # Add road markings
    draw = ImageDraw.Draw(img)
    draw.rectangle([80, 100, 320, 200], outline=(180, 180, 180), width=3)
    draw.line([200, 100, 200, 200], fill=(180, 180, 180), width=2)
    
    # Add some wet spots (darker areas)
    for _ in range(5):
        x = np.random.randint(100, 300)
        y = np.random.randint(120, 180)
        draw.ellipse([x, y, x+40, y+30], fill=(45, 45, 50))
    
    img = img.filter(ImageFilter.GaussianBlur(radius=1.5))
    
    return img

def create_wet_image():
    """Create a simulated WET track image"""
    # Wet asphalt with reflections
    img = Image.new('RGB', (400, 300), color=(35, 35, 40))
    pixels = img.load()
    
    # Add texture with lots of moisture
    for i in range(img.width):
        for j in range(img.height):
            noise = np.random.randint(-20, 20)
            # More sheen from wetness
            sheen = np.random.randint(0, 50) if np.random.random() > 0.5 else 0
            
            r, g, b = 35 + noise + sheen, 35 + noise + sheen, 40 + noise + sheen
            pixels[i, j] = (max(0, min(255, r)), 
                           max(0, min(255, g)), 
                           max(0, min(255, b)))
    
    # Add road markings (faded in wet)
    draw = ImageDraw.Draw(img)
    draw.rectangle([80, 100, 320, 200], outline=(120, 120, 120), width=3)
    draw.line([200, 100, 200, 200], fill=(120, 120, 120), width=2)
    
    # Add large wet areas
    for _ in range(8):
        x = np.random.randint(80, 320)
        y = np.random.randint(100, 200)
        size = np.random.randint(30, 80)
        draw.ellipse([x, y, x+size, y+size//2], fill=(30, 30, 35))
    
    # Add reflections (light streaks)
    for _ in range(3):
        x = np.random.randint(100, 300)
        y = np.random.randint(120, 180)
        draw.line([x, y, x+60, y+5], fill=(100, 100, 110), width=2)
    
    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    
    return img

# Create directories
os.makedirs("data/raw/dry", exist_ok=True)
os.makedirs("data/raw/damp", exist_ok=True)
os.makedirs("data/raw/wet", exist_ok=True)

print("Creating DRY images...")
for i in range(5):
    img = create_dry_image()
    img.save(f"data/raw/dry/dry_{i:02d}.jpg")
    print(f"  ✓ Created: dry_{i:02d}.jpg")

print("\nCreating DAMP images...")
for i in range(5):
    img = create_damp_image()
    img.save(f"data/raw/damp/damp_{i:02d}.jpg")
    print(f"  ✓ Created: damp_{i:02d}.jpg")

print("\nCreating WET images...")
for i in range(5):
    img = create_wet_image()
    img.save(f"data/raw/wet/wet_{i:02d}.jpg")
    print(f"  ✓ Created: wet_{i:02d}.jpg")

print("\n" + "="*70)
print("✓ SYNTHETIC IMAGES CREATED!")
print("="*70)

# Verify
dry_count = len(os.listdir("data/raw/dry"))
damp_count = len(os.listdir("data/raw/damp"))
wet_count = len(os.listdir("data/raw/wet"))

print(f"\nImages created:")
print(f"  DRY:  {dry_count}")
print(f"  DAMP: {damp_count}")
print(f"  WET:  {wet_count}")
print(f"  Total: {dry_count + damp_count + wet_count}")
print("\nReady to train! Run: python scripts/train_classifier.py\n")

