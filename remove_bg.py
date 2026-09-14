import sys
from rembg import remove, new_session
from PIL import Image

def remove_bg(input_path, output_path):
    try:
        input_image = Image.open(input_path)
        # Use a much smaller model (u2netp is ~4MB)
        session = new_session("u2netp")
        output_image = remove(input_image, session=session)
        output_image.save(output_path)
        print(f"Success! Saved to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <input> <output>")
    else:
        remove_bg(sys.argv[1], sys.argv[2])
