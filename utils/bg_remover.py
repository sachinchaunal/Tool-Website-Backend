import sys
import os
from PIL import Image
from rembg import remove

def remove_background(input_path, output_path, model_name='u2net'):
    """
    Remove background from an image.
    
    Args:
        input_path (str): Path to input image
        output_path (str): Path to save output image
        model_name (str): Model to use for background removal ('u2net' or 'u2net_human_seg')
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Open input image
        input_image = Image.open(input_path)
          # Remove background
        # model_name can be 'u2net', 'u2net_human_seg', etc.
        output_image = remove(input_image, session=None, alpha_matting=False, alpha_matting_foreground_threshold=240,
                             alpha_matting_background_threshold=10, alpha_matting_erode_size=10)
        # Save output image
        output_image.save(output_path)
        
        return True
    except Exception as e:
        print(f"Error in background removal: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    # This allows the script to be called directly from command line
    if len(sys.argv) < 3:
        print("Usage: python bg_remover.py <input_path> <output_path> [model_name]")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    model_name = sys.argv[3] if len(sys.argv) > 3 else 'u2net'
    
    success = remove_background(input_path, output_path, model_name)
    
    if success:
        print("Background removal complete.")
    else:
        print("Background removal failed.")
        sys.exit(1)
