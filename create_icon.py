#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon():
    # Create a 256x256 image with transparent background
    size = 256
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw blue rounded rectangle background
    margin = 20
    draw.rounded_rectangle(
        [margin, margin, size-margin, size-margin], 
        radius=20, 
        fill=(37, 99, 235, 255)  # Blue color
    )
    
    # Draw tank icon (simplified)
    tank_x = size // 2 - 40
    tank_y = size // 2 - 30
    tank_width = 80
    tank_height = 60
    
    # Tank body
    draw.rounded_rectangle(
        [tank_x, tank_y, tank_x + tank_width, tank_y + tank_height],
        radius=8,
        fill=(255, 255, 255, 255)
    )
    
    # Tank level indicator
    level_height = 35
    draw.rounded_rectangle(
        [tank_x + 5, tank_y + tank_height - level_height - 5, 
         tank_x + tank_width - 5, tank_y + tank_height - 5],
        radius=4,
        fill=(34, 197, 94, 255)  # Green color
    )
    
    # Tank top
    draw.ellipse(
        [tank_x - 5, tank_y - 10, tank_x + tank_width + 5, tank_y + 10],
        fill=(255, 255, 255, 255)
    )
    
    # Save the icon
    img.save('electron/icon.png', 'PNG')
    print("Icon created: electron/icon.png")

if __name__ == "__main__":
    create_icon()
