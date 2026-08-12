"""
Download sample racing images for training
"""

import os
import urllib.request
from pathlib import Path

os.makedirs("data/raw/dry", exist_ok=True)
os.makedirs("data/raw/damp", exist_ok=True)
os.makedirs("data/raw/wet", exist_ok=True)

print("Downloading sample images...")
print("This may take a minute...")


images = {
    'dry': [
        'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1514821985556-924dc13e8c5e?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1571512696329-aba3ad6db403?w=400&h=300&fit=crop',
    ],
    'damp': [
        'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1557638352-fccdf0ffb181?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1600631814534-751eca6be4a9?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1621905167918-48416bd8575a?w=400&h=300&fit=crop',
    ],
    'wet': [
        'https://images.unsplash.com/photo-1583272335935-c8d1601baf79?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1593656611305-e106a4eb4c32?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1571521694776-0404bca856bc?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1566023967268-70bec2f8bef5?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop',
    ]
}


for condition, urls in images.items():
    print(f"\nDownloading {condition.upper()} images...")
    
    for i, url in enumerate(urls):
        try:
            filename = f"data/raw/{condition}/{condition}_{i:02d}.jpg"
            print(f"  Downloading: {filename}...", end=" ")
            urllib.request.urlretrieve(url, filename, timeout=10)
            print("✓")
        except Exception as e:
            print(f"✗ Failed: {e}")

print("\n" + "="*60)
print("✓ DATA DOWNLOAD COMPLETE!")
print("="*60)

dry_count = len(os.listdir("data/raw/dry"))
damp_count = len(os.listdir("data/raw/damp"))
wet_count = len(os.listdir("data/raw/wet"))

print(f"\nImages downloaded:")
print(f"  DRY:  {dry_count}")
print(f"  DAMP: {damp_count}")
print(f"  WET:  {wet_count}")
print(f"  Total: {dry_count + damp_count + wet_count}")

