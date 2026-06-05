"""Generate simple, colorful flashcard images for new RAZ vocabulary words."""
import json
import os
from PIL import Image, ImageDraw, ImageFont
import colorsys
import random

random.seed(42)  # consistent colors per word

# Read the new words from JSON
with open('public/raz-import-data.json', 'r') as f:
    data = json.load(f)

# Find words without images (pending status, lessonId >= 24)
new_words = [w for w in data['words'] if w['lessonId'] >= 24]
print(f"Found {len(new_words)} new words to generate images for")

IMG_DIR = 'public/images'
os.makedirs(IMG_DIR, exist_ok=True)

W, H = 400, 300

# Kid-friendly pastel color palettes — each lesson gets a different hue range
def lesson_color(lesson_id):
    """Return a pastel background color based on lesson."""
    if lesson_id == 24:  # Firsts — warm yellow/orange
        h = 0.12 + random.random() * 0.08
        s = 0.4
        v = 0.95
    elif lesson_id == 25:  # Farms — green
        h = 0.2 + random.random() * 0.15
        s = 0.35
        v = 0.92
    else:  # Factories — blue/purple
        h = 0.55 + random.random() * 0.12
        s = 0.3
        v = 0.93

    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return (int(r * 255), int(g * 255), int(b * 255))

def darken(color, factor=0.5):
    return tuple(int(c * factor) for c in color)

def slug(word):
    return word.replace(' ', '-').lower()

def get_accent_shape(draw, word):
    """Return a simple shape description based on word category."""
    shapes = ['circle', 'rounded_square', 'hexagon', 'diamond']
    return random.choice(shapes)

def draw_rounded_rect(draw, xy, r, fill):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=r, fill=fill)

def generate_image(word, lesson_id, filepath):
    """Generate a simple, colorful flashcard image."""
    bg_color = lesson_color(lesson_id)
    accent_color = darken(bg_color, 0.6)
    text_color = darken(bg_color, 0.3)

    img = Image.new('RGB', (W, H), bg_color)
    draw = ImageDraw.Draw(img)

    # Draw subtle decorative circles in background
    for _ in range(5):
        cx = random.randint(-50, W + 50)
        cy = random.randint(-50, H + 50)
        r = random.randint(20, 80)
        deco_color = (*darken(bg_color, 0.85), 60)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                     fill=bg_color, outline=deco_color, width=3)

    # Draw a circular badge in the center for the first letter
    badge_r = 55
    badge_center = (W // 2, H // 2 - 25)
    badge_bbox = [
        badge_center[0] - badge_r,
        badge_center[1] - badge_r,
        badge_center[0] + badge_r,
        badge_center[1] + badge_r,
    ]
    # White circle
    draw.ellipse(badge_bbox, fill=(255, 255, 255, 255), outline=accent_color, width=4)

    # Draw first letter in the badge
    first_letter = word[0].upper()
    # Try to load a font, fall back to default
    try:
        # Try system fonts
        for font_path in [
            '/System/Library/Fonts/HelveticaNeue.ttc',
            '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
            '/System/Library/Fonts/Supplemental/Arial.ttf',
        ]:
            try:
                font_large = ImageFont.truetype(font_path, 70)
                break
            except:
                continue
        else:
            font_large = ImageFont.load_default()
    except:
        font_large = ImageFont.load_default()

    # Center the letter in the badge
    bbox = draw.textbbox((0, 0), first_letter, font=font_large)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        (badge_center[0] - tw // 2 - bbox[0], badge_center[1] - th // 2 - bbox[0]),
        first_letter, fill=accent_color, font=font_large
    )

    # Draw word below the badge
    try:
        font_word = ImageFont.truetype(font_path, 24)
    except:
        font_word = ImageFont.load_default()

    # Word text
    bbox = draw.textbbox((0, 0), word, font=font_word)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    word_y = badge_center[1] + badge_r + 20
    draw.text(
        (W // 2 - tw // 2 - bbox[0], word_y),
        word, fill=text_color, font=font_word
    )

    # Save
    img.save(filepath, 'PNG', optimize=True)
    return True

generated = 0
for w in new_words:
    filename = slug(w['word']) + '.png'
    filepath = os.path.join(IMG_DIR, filename)

    # Skip if image already exists
    if os.path.exists(filepath):
        print(f"  Skip (exists): {filename}")
        generated += 1
        continue

    try:
        generate_image(w['word'], w['lessonId'], filepath)
        print(f"  ✓ {filename}")
        generated += 1
    except Exception as e:
        print(f"  ✗ {filename}: {e}")

print(f"\nGenerated/confirmed {generated}/{len(new_words)} images")
print(f"Images are in {IMG_DIR}/")
