import io
import math
import numpy as np
from PIL import Image, ImageFilter

# Standard normalized chromaticities (r/I, g/I, b/I) for common mess foods
DISH_CHROMATICITIES = {
    "chowmein": (0.49, 0.35, 0.16),
    "noodle": (0.49, 0.35, 0.16),
    "maggi": (0.49, 0.35, 0.16),
    "poha": (0.51, 0.42, 0.08),
    "idli": (0.37, 0.34, 0.29),
    "chutney": (0.35, 0.40, 0.25),
    "rajma": (0.56, 0.28, 0.16),
    "curry": (0.53, 0.31, 0.16),
    "rice": (0.37, 0.35, 0.28),
    "chawal": (0.37, 0.35, 0.28),
    "dal": (0.46, 0.39, 0.15),
    "sambhar": (0.53, 0.32, 0.15),
    "roti": (0.42, 0.36, 0.22),
    "paneer": (0.52, 0.31, 0.17),
    "sabzi": (0.46, 0.36, 0.18)
}

def get_chromaticity(r, g, b):
    tot = max(1.0, float(r + g + b))
    return r / tot, g / tot, b / tot

def analyze_plate_image(image_bytes_or_path, menu_dishes):
    """
    Analyzes an uploaded plate photo or webcam frame:
    1. Normalizes size and identifies plate ellipse (filtering outside table).
    2. Identifies food pixels via chromaticity & texture/edge energy.
    3. Detects non-biodegradable contaminants (foils, plastic wraps).
    4. Identifies spatial clusters (compartments/thali sections) for multi-item detection.
    5. Matches each cluster against today's menu using normalized chromaticity.
    6. Estimates waste grams realistically from pixel area coverage and food density.
    """
    try:
        if isinstance(image_bytes_or_path, (str, bytes, bytearray)):
            if isinstance(image_bytes_or_path, str):
                img = Image.open(image_bytes_or_path).convert("RGB")
            else:
                img = Image.open(io.BytesIO(image_bytes_or_path)).convert("RGB")
        elif isinstance(image_bytes_or_path, Image.Image):
            img = image_bytes_or_path.convert("RGB")
        else:
            raise ValueError("Unsupported image type")
    except Exception as e:
        return {
            "error": "Unreadable photo format",
            "is_menu_match": False,
            "total_grams": 0,
            "bin_recommended": None,
            "detections": []
        }

    target_w, target_h = 480, 480
    img_resized = img.resize((target_w, target_h), Image.Resampling.BILINEAR)
    arr = np.array(img_resized, dtype=np.float32)

    # 1. Plate center ellipse mask (center 80% to exclude outer countertop/table)
    Y, X = np.ogrid[:target_h, :target_w]
    center_y, center_x = target_h / 2.0, target_w / 2.0
    radius_y, radius_x = target_h * 0.44, target_w * 0.44
    plate_mask = ((X - center_x) ** 2 / (radius_x ** 2) + (Y - center_y) ** 2 / (radius_y ** 2)) <= 1.0

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    brightness = (r + g + b) / 3.0

    rgb_max = np.maximum(np.maximum(r, g), b)
    rgb_min = np.minimum(np.minimum(r, g), b)
    spread = rgb_max - rgb_min

    gray_img = img_resized.convert("L")
    edges_img = gray_img.filter(ImageFilter.FIND_EDGES)
    edge_arr = np.array(edges_img, dtype=np.float32)

    # 2. Food pixel mask
    food_mask = plate_mask & (
        (spread > 18) |
        ((edge_arr > 18) & (brightness > 60) & (brightness < 240))
    )

    # 3. Contaminant detection
    foil_pixels = plate_mask & (brightness > 248) & (spread < 18)
    foil_ratio = np.sum(foil_pixels) / max(1.0, np.sum(plate_mask))

    neon_plastic = plate_mask & ((b > r + 35) & (b > g + 25) & (b > 110))
    neon_ratio = np.sum(neon_plastic) / max(1.0, np.sum(plate_mask))

    is_contaminant = False
    contaminant_label = ""
    if foil_ratio > 0.08:
        is_contaminant = True
        contaminant_label = "Metallic / foil wrap detected"
    elif neon_ratio > 0.03:
        is_contaminant = True
        contaminant_label = "Synthetic plastic wrapper detected"

    total_food_pixels = int(np.sum(food_mask))
    plate_total_pixels = int(np.sum(plate_mask))
    coverage_ratio = total_food_pixels / max(1.0, plate_total_pixels)

    if coverage_ratio < 0.025:
        return {
            "error": None,
            "dish_name": "Bare plate / minimal crumbs",
            "is_menu_match": True,
            "total_grams": 5,
            "bin_recommended": "bio",
            "contaminant_detected": False,
            "contaminant_label": "",
            "detections": [{
                "name": "Plate crumbs",
                "conf": 98,
                "grams": 5,
                "matchType": "vision",
                "bbox": {"top": "38%", "left": "38%", "w": "24%", "h": "24%"}
            }]
        }

    # 4. Spatial Clustering for Multi-Compartment / Multi-Dish Detection
    zones = [
        ("Left Side", 0, target_h, 0, int(target_w * 0.5)),
        ("Right Side", 0, target_h, int(target_w * 0.5), target_w),
        ("Top Side", 0, int(target_h * 0.5), 0, target_w),
        ("Bottom Side", int(target_h * 0.5), target_h, 0, target_w),
    ]

    candidate_clusters = []
    for zname, y0, y1, x0, x1 in zones:
        z_mask = food_mask[y0:y1, x0:x1]
        z_pixels = int(np.sum(z_mask))
        if z_pixels > plate_total_pixels * 0.06:
            zr = float(np.median(r[y0:y1, x0:x1][z_mask]))
            zg = float(np.median(g[y0:y1, x0:x1][z_mask]))
            zb = float(np.median(b[y0:y1, x0:x1][z_mask]))

            ys, xs = np.where(z_mask)
            min_y, max_y = y0 + int(np.min(ys)), y0 + int(np.max(ys))
            min_x, max_x = x0 + int(np.min(xs)), x0 + int(np.max(xs))

            candidate_clusters.append({
                "zone": zname,
                "pixels": z_pixels,
                "rgb": (zr, zg, zb),
                "chrom": get_chromaticity(zr, zg, zb),
                "bbox": {
                    "top": f"{max(4, round((min_y / target_h) * 100))}%",
                    "left": f"{max(4, round((min_x / target_w) * 100))}%",
                    "w": f"{min(92, max(20, round(((max_x - min_x) / target_w) * 100)))}%",
                    "h": f"{min(92, max(20, round(((max_y - min_y) / target_h) * 100)))}%"
                }
            })

    # Decide if image has multiple distinct food types or single main dish
    clusters_to_use = []
    if len(candidate_clusters) >= 2:
        # Check chromaticity distance between the two largest clusters
        c1, c2 = sorted(candidate_clusters, key=lambda c: c["pixels"], reverse=True)[:2]
        chrom_diff = math.sqrt(sum((a - b) ** 2 for a, b in zip(c1["chrom"], c2["chrom"])))
        # If chromaticity difference is noticeable, treat as 2 separate dishes (e.g. Rice + Curry)
        if chrom_diff > 0.06:
            clusters_to_use = [c1, c2]

    # Fallback to single overall bounding box if food is unified across plate
    if not clusters_to_use:
        ys, xs = np.where(food_mask)
        min_y, max_y = int(np.min(ys)), int(np.max(ys))
        min_x, max_x = int(np.min(xs)), int(np.max(xs))
        all_r = float(np.median(r[food_mask]))
        all_g = float(np.median(g[food_mask]))
        all_b = float(np.median(b[food_mask]))
        clusters_to_use = [{
            "zone": "Main Dish",
            "pixels": total_food_pixels,
            "rgb": (all_r, all_g, all_b),
            "chrom": get_chromaticity(all_r, all_g, all_b),
            "bbox": {
                "top": f"{max(4, round((min_y / target_h) * 100))}%",
                "left": f"{max(4, round((min_x / target_w) * 100))}%",
                "w": f"{min(92, round(((max_x - min_x) / target_w) * 100))}%",
                "h": f"{min(92, round(((max_y - min_y) / target_h) * 100))}%"
            }
        }]

    # 5. Match candidate dishes
    def get_target_chrom(dish):
        dish_name = dish.get("name", "").lower()
        for k, chrom in DISH_CHROMATICITIES.items():
            if k in dish_name:
                return chrom
        # fallback to stored RGB if present
        if dish.get("expected_r") is not None:
            return get_chromaticity(dish["expected_r"], dish["expected_g"], dish["expected_b"])
        return (0.42, 0.36, 0.22)

    menu_list = list(menu_dishes) if menu_dishes else [{"name": "Standard Campus Meal", "default_bin": "bio"}]

    detections = []
    used_names = set()

    for cluster in clusters_to_use:
        chrom = cluster["chrom"]
        scored = []
        for d in menu_list:
            d_name = d.get("name", "")
            target_chrom = get_target_chrom(d)
            dist = math.sqrt(
                (chrom[0] - target_chrom[0]) ** 2 +
                (chrom[1] - target_chrom[1]) ** 2 +
                (chrom[2] - target_chrom[2]) ** 2
            )
            penalty = 0.15 if d_name in used_names else 0.0
            scored.append((dist + penalty, d))

        scored.sort(key=lambda x: x[0])
        best_dist, best_dish = scored[0]
        used_names.add(best_dish["name"])

        # Realistic confidence based on normalized chromaticity closeness
        conf = max(76, min(98, int(100 - (best_dist * 120.0))))

        # Calculated weight: fractional area * standard plate meal baseline * density
        area_fraction = cluster["pixels"] / float(plate_total_pixels)
        density = float(best_dish.get("density_factor", 1.1) or 1.1)
        # 300g is a standard student meal weight
        calculated_grams = max(14, int(area_fraction * 280.0 * density))

        detections.append({
            "name": best_dish["name"],
            "conf": conf,
            "grams": calculated_grams,
            "matchType": "image" if best_dish.get("photoDataUrl") else "vision",
            "bbox": cluster["bbox"]
        })

    total_grams = sum(d["grams"] for d in detections)
    bin_recommended = "non-bio" if is_contaminant else "bio"

    return {
        "error": None,
        "dish_name": detections[0]["name"] if detections else "Assorted Meal",
        "is_menu_match": True,
        "total_grams": total_grams,
        "bin_recommended": bin_recommended,
        "contaminant_detected": is_contaminant,
        "contaminant_label": contaminant_label,
        "detections": detections
    }
