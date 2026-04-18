// ─── Comprehensive Recraft styles data ──────────────────────────────────────
// Each style maps to a specific Recraft model, API style, and substyle.
// The `coverPrompt` is used to generate a representative cover image via the API.

export interface StyleEntry {
  name: string;
  model: string;         // display model name
  apiModel: string;      // API model value (recraftv3, recraftv2, etc.)
  apiStyle: string;      // API style value
  apiSubstyle?: string;  // API substyle value
  isNew?: boolean;
  coverPrompt: string;   // prompt to generate cover image for this style
}

export interface StyleCategory {
  title: string;
  subtitle?: string;
  styles: StyleEntry[];
}

// Helper to build a Recraft V3 entry
const v3 = (name: string, style: string, substyle?: string, coverPrompt?: string): StyleEntry => ({
  name, model: 'Recraft V3', apiModel: 'recraftv3', apiStyle: style,
  ...(substyle && { apiSubstyle: substyle }),
  coverPrompt: coverPrompt || `Beautiful ${name.toLowerCase()} style artwork`,
});

const v3vec = (name: string, style: string, substyle?: string, coverPrompt?: string): StyleEntry => ({
  name, model: 'Recraft V3', apiModel: 'recraftv3_vector', apiStyle: style,
  ...(substyle && { apiSubstyle: substyle }),
  coverPrompt: coverPrompt || `Beautiful ${name.toLowerCase()} style artwork`,
});

const v2 = (name: string, style: string, substyle?: string, coverPrompt?: string): StyleEntry => ({
  name, model: 'Recraft V2', apiModel: 'recraftv2', apiStyle: style,
  ...(substyle && { apiSubstyle: substyle }),
  coverPrompt: coverPrompt || `Beautiful ${name.toLowerCase()} style artwork`,
});

const v2vec = (name: string, style: string, substyle?: string, coverPrompt?: string): StyleEntry => ({
  name, model: 'Recraft V2', apiModel: 'recraftv2_vector', apiStyle: style,
  ...(substyle && { apiSubstyle: substyle }),
  coverPrompt: coverPrompt || `Beautiful ${name.toLowerCase()} style artwork`,
});

export const STYLE_CATEGORIES: StyleCategory[] = [
  {
    title: 'Photorealism',
    styles: [
      v3('Photorealism', 'realistic_image', undefined, 'A stunning photorealistic landscape with golden hour light'),
      v3('Enterprise', 'realistic_image', 'enterprise', 'Corporate office building with modern glass architecture'),
      v3('Natural light', 'realistic_image', 'natural_light', 'Portrait of a person in soft natural window light'),
      v3('Studio photo', 'realistic_image', 'studio_photo', 'Product on white background with studio lighting'),
      v3('HDR', 'realistic_image', 'hdr', 'Dramatic HDR cityscape at sunset with vivid colors'),
      v3('Hard flash', 'realistic_image', 'hard_flash', 'Fashion portrait with harsh flash lighting'),
      v3('Motion blur', 'realistic_image', 'motion_blur', 'Racing car with dynamic motion blur effect'),
      v3('Black & white', 'realistic_image', 'b_and_w', 'Moody black and white street photography scene'),
      v3('Faded Nostalgia', 'realistic_image', 'faded_nostalgia', 'Vintage faded photograph of a summer afternoon'),
      v3('Mystic Naturalism', 'realistic_image', 'mystic_naturalism', 'Mystical forest with ethereal morning mist and rays'),
      v3('Organic Calm', 'realistic_image', 'organic_calm', 'Serene zen garden with smooth stones and water'),
      v3('Retro Snapshot', 'realistic_image', 'retro_snapshot', 'Retro polaroid-style snapshot of a beach scene'),
      v3('Urban Drama', 'realistic_image', 'urban_drama', 'Dramatic urban alleyway with neon reflections on wet pavement'),
      v3('Village Realism', 'realistic_image', 'village_realism', 'Rustic village with stone cottages and morning fog'),
      v2('Photorealism', 'realistic_image', undefined, 'A stunning photorealistic mountain landscape'),
      v2('Blossom Glow', 'realistic_image', 'blossom_glow', 'Cherry blossom tree glowing in warm sunset light'),
    ],
  },
  {
    title: 'Illustration',
    styles: [
      v3('Recraft V3 Raw', 'digital_illustration', undefined, 'A vibrant digital illustration of a fantasy world'),
      v3('Illustration', 'digital_illustration', undefined, 'Colorful digital illustration of a whimsical garden'),
      v3('Hand-drawn', 'digital_illustration', 'hand_drawn', 'Hand-drawn sketch of a cozy cafe interior'),
      v3('Grain', 'digital_illustration', 'grain', 'Grainy textured illustration of a night city'),
      v3('Bold Sketch', 'digital_illustration', 'bold_sketch', 'Bold sketched portrait with thick expressive lines'),
      v3('Pencil sketch', 'digital_illustration', undefined, 'Detailed pencil sketch of an old European building'),
      v3('Retro Pop', 'digital_illustration', 'retro_pop', 'Retro pop art style illustration of a diner'),
      v3('Clay', 'digital_illustration', 'clay', 'Cute clay-style 3D characters in a miniature scene'),
      v3('Risograph', 'digital_illustration', 'risograph', 'Risograph-printed illustration with halftone textures'),
      v3('Color engraving', 'digital_illustration', 'color_engraving', 'Detailed color engraving of botanical flowers'),
      v3('Pixel art', 'digital_illustration', 'pixel_art', 'Retro pixel art game scene with 16-bit style'),
      v3('Engraving', 'digital_illustration', 'engraving', 'Classical engraving of a sailing ship on the ocean'),
      v3('Antiquarian', 'digital_illustration', 'antiquarian', 'Antiquarian map illustration with old parchment style'),
      v3('Bold fantasy', 'digital_illustration', 'bold_fantasy', 'Epic fantasy battle scene with bold dynamic colors'),
      v3('Child book', 'digital_illustration', 'child_book', 'Cute children book illustration of animals in a forest'),
      v3('Hard Comics', 'digital_illustration', 'hard_comics', 'Bold comic book panel with action scene'),
      v3('Modern Folk', 'digital_illustration', 'modern_folk', 'Modern folk art pattern with nature motifs'),
      v3('Multicolor', 'digital_illustration', 'multicolor', 'Vibrant multicolor abstract composition'),
      v3('Neon Calm', 'digital_illustration', 'neon_calm', 'Calm neon-lit lofi room at night'),
      v3('Nostalgic pastel', 'digital_illustration', 'nostalgic_pastel', 'Soft pastel illustration of a countryside cottage'),
      v3('Outline details', 'digital_illustration', 'outline_details', 'Detailed outline illustration of a botanical garden'),
      v3('Tablet sketch', 'digital_illustration', 'tablet_sketch', 'Digital tablet sketch of a character concept'),
      v3('Young adult book 2', 'digital_illustration', 'young_adult_book_2', 'Young adult book cover with dramatic teen protagonist'),
      v3('Seamless Digital', 'digital_illustration', 'seamless', 'Seamless repeating digital pattern with flowers'),
      v2('Illustration', 'digital_illustration', undefined, 'A colorful digital illustration of a fantasy castle'),
      v2('Plastic 3D', 'digital_illustration', 'plastic_3d', 'Glossy plastic 3D rendered toy characters'),
      v2('3D render', 'digital_illustration', '3d_render', 'Isometric 3D render of a tiny room scene'),
      v2('Glow', 'digital_illustration', 'glow', 'Glowing ethereal illustration with light effects'),
      v2('Watercolor', 'digital_illustration', 'watercolor', 'Delicate watercolor painting of a seaside town'),
      v2('Kawaii', 'digital_illustration', 'kawaii', 'Adorable kawaii characters with cute expressions'),
      v2('Bright Scholar', 'digital_illustration', 'bright_scholar', 'Bright scholarly illustration of books and learning'),
      v2('Soft Abstract', 'digital_illustration', 'soft_abstract', 'Soft abstract shapes in harmonious pastel tones'),
    ],
  },
  {
    title: '3D Isometric',
    styles: [
      v3('3D Isometric Icon', 'digital_illustration', '3d_isometric', 'Isometric 3D icon of a small house with garden'),
    ],
  },
  {
    title: 'Vector art',
    styles: [
      v3vec('Vector art', 'vector_illustration', undefined, 'Clean vector art of a mountain landscape'),
      v3vec('Line art', 'vector_illustration', 'line_art', 'Elegant line art of a woman profile'),
      v3vec('Linocut', 'vector_illustration', 'linocut', 'Bold linocut print of a forest animal'),
      v3vec('Color blobs', 'vector_illustration', 'color_blobs', 'Abstract color blob vector composition'),
      v3vec('Bold stroke', 'vector_illustration', 'bold_stroke', 'Bold stroke vector illustration of a bird'),
      v3vec('Chemistry', 'vector_illustration', 'chemistry', 'Scientific chemistry vector diagrams and molecules'),
      v3vec('Colored stencil', 'vector_illustration', 'colored_stencil', 'Colored stencil art of a city skyline'),
      v3vec('Cosmics', 'vector_illustration', 'cosmics', 'Cosmic space vector art with planets and stars'),
      v3vec('Marker outline', 'vector_illustration', 'marker_outline', 'Marker-style outlined vector of a coffee shop'),
      v3vec('Mosaic', 'vector_illustration', 'mosaic', 'Geometric mosaic vector art pattern'),
      v3vec('Naivector', 'vector_illustration', 'naivector', 'Naive-style vector illustration of a village'),
      v3vec('Roundish flat', 'vector_illustration', 'roundish_flat', 'Rounded flat vector characters in a park'),
      v3vec('Segmented Colors', 'vector_illustration', 'segmented_colors', 'Segmented color block vector landscape'),
      v3vec('Sharp contrast', 'vector_illustration', 'sharp_contrast', 'High contrast sharp vector graphic'),
      v3vec('Vector Photo', 'vector_illustration', 'vector_photo', 'Photo-realistic vector illustration of a person'),
      v3vec('Vivid shapes', 'vector_illustration', 'vivid_shapes', 'Vivid geometric shapes in vector style'),
      v3vec('Seamless Vector', 'vector_illustration', 'seamless', 'Seamless repeating vector pattern'),
      v2vec('Vector art', 'vector_illustration', undefined, 'Clean flat vector landscape'),
      v2vec('Cartoon', 'vector_illustration', 'cartoon', 'Fun cartoon vector characters'),
      v2vec('Vector Kawaii', 'vector_illustration', 'kawaii', 'Cute kawaii vector stickers'),
    ],
  },
  {
    title: 'Icon',
    styles: [
      v2vec('Icon', 'icon', undefined, 'Clean app icon design on solid background'),
      v2vec('Outline', 'icon', 'outline', 'Thin outline icon set for mobile app'),
      v2vec('Pictogram', 'icon', 'pictogram', 'Simple pictogram icons for wayfinding'),
      v2vec('Colored outline', 'icon', 'colored_outline', 'Colorful outlined icon pack'),
      v2vec('Doodle', 'icon', 'doodle', 'Hand-drawn doodle icon collection'),
      v2vec('Colored shape', 'icon', 'colored_shape', 'Solid colored shape icons'),
      v2vec('Gradient outline', 'icon', 'gradient_outline', 'Icons with gradient colored outlines'),
      v2vec('Offset doodle', 'icon', 'offset_doodle', 'Offset shadow doodle style icons'),
      v2vec('Gradient shape', 'icon', 'gradient_shape', 'Gradient filled shape icons'),
      v2vec('Broken line', 'icon', 'broken_line', 'Broken line style minimalist icons'),
      v2vec('Offset fill', 'icon', 'offset_fill', 'Offset filled icon designs'),
      v3vec('Razor Bloom', 'icon', 'razor_bloom', 'Sharp razor bloom style icon'),
    ],
  },
  {
    title: 'Graphic design',
    styles: [
      v3('Prestige Emblem', 'digital_illustration', 'prestige_emblem', 'Luxurious gold emblem badge design'),
      v3('Pop Graphic', 'digital_illustration', 'pop_graphic', 'Bold pop art graphic design poster'),
      v3('Stamp', 'digital_illustration', 'stamp', 'Vintage postal stamp design with ornate border'),
      v3('Punk Graphic', 'digital_illustration', 'punk_graphic', 'Gritty punk rock concert poster design'),
      v3('Vintage Emblem', 'digital_illustration', 'vintage_emblem', 'Vintage emblem with classic typography'),
      v3('Mixed Media Graphic', 'digital_illustration', 'mixed_media_graphic', 'Mixed media collage graphic design'),
      v3('Sharp Metal Graphic', 'digital_illustration', 'sharp_metal_graphic', 'Metallic sharp-edged graphic design'),
      v3('Trippy Retro Graphic', 'digital_illustration', 'trippy_retro_graphic', 'Psychedelic retro graphic poster'),
      v3('Bold Vibrant Graphic', 'digital_illustration', 'bold_vibrant_graphic', 'Bold vibrant graphic with saturated colors'),
    ],
  },
  {
    title: 'Vector logo',
    styles: [
      v3vec('Vector logo', 'vector_illustration', undefined, 'Modern minimalist logo on dark background'),
      v2vec('Vector logo', 'vector_illustration', undefined, 'Clean vector logo design'),
      v3vec('Minimal Vibrant Logo', 'vector_illustration', 'minimal_vibrant_logo', 'Minimal vibrant colored logo mark'),
      v3vec('Typographic Logo', 'vector_illustration', 'typographic_logo', 'Bold typographic wordmark logo'),
      v3vec('Handwritten Logo', 'vector_illustration', 'handwritten_logo', 'Elegant handwritten script logo'),
      v3vec('Geometric Logo', 'vector_illustration', 'geometric_logo', 'Geometric abstract logo design'),
      v3vec('Playful Typographic Logo', 'vector_illustration', 'playful_typographic_logo', 'Fun playful typography logo'),
      v3vec('Colorful Badge Logo', 'vector_illustration', 'colorful_badge_logo', 'Colorful vintage badge logo'),
      v3vec('Sharp Drawn Logo', 'vector_illustration', 'sharp_drawn_logo', 'Sharp hand-drawn logo illustration'),
      v3vec('Shape Stack Logo', 'vector_illustration', 'shape_stack_logo', 'Stacked geometric shapes logo'),
      v3vec('Round Drawn Logo', 'vector_illustration', 'round_drawn_logo', 'Rounded hand-drawn circular logo'),
      v3vec('Vintage Decorative Logo', 'vector_illustration', 'vintage_decorative_logo', 'Ornate vintage decorative logo'),
    ],
  },
  {
    title: 'Product photo',
    styles: [
      v3('Product photo', 'realistic_image', 'product_photo', 'Professional product photography with clean background'),
      v2('Product photo', 'realistic_image', 'product_photo', 'Clean product shot with white background'),
    ],
  },
  {
    title: 'Other styles',
    styles: [
      v3('Cover', 'digital_illustration', 'cover', 'Dramatic book or album cover artwork'),
      v3('Crosshatch', 'digital_illustration', 'crosshatch', 'Detailed crosshatch pen drawing'),
      v3('Digital engraving', 'digital_illustration', 'digital_engraving', 'Detailed digital engraving of architecture'),
      v3('Expressionism', 'digital_illustration', 'expressionism', 'Expressionist painting with bold brushstrokes'),
      v3('Freehand details', 'digital_illustration', 'freehand_details', 'Freehand detailed sketch of a cat'),
      v3('Grain 2.0', 'digital_illustration', 'grain_2', 'Grainy textured illustration of mountains'),
      v3('Graphic intensity', 'digital_illustration', 'graphic_intensity', 'High intensity graphic design composition'),
      v3('Long shadow', 'digital_illustration', 'long_shadow', 'Flat design with long drop shadows'),
      v3('Noir', 'digital_illustration', 'noir', 'Film noir detective scene with dramatic shadows'),
      v3('Pastel gradient', 'digital_illustration', 'pastel_gradient', 'Soft pastel gradient abstract artwork'),
      v3('Pastel sketch', 'digital_illustration', 'pastel_sketch', 'Delicate pastel pencil sketch of flowers'),
      v3('Pop art', 'digital_illustration', 'pop_art', 'Andy Warhol-inspired pop art portrait'),
      v3('Pop renaissance', 'digital_illustration', 'pop_renaissance', 'Renaissance painting with modern pop art twist'),
      v3('Street art', 'digital_illustration', 'street_art', 'Urban street art mural on brick wall'),
      v3('Urban Glow', 'digital_illustration', 'urban_glow', 'Glowing neon urban nightscape'),
      v3('Urban sketching', 'digital_illustration', 'urban_sketching', 'Loose urban sketch of a European plaza'),
      v3('Young adult book', 'digital_illustration', 'young_adult_book', 'Young adult fantasy book cover'),
      v3('Evening light', 'digital_illustration', 'evening_light', 'Warm evening light through autumn trees'),
      v3('Forest life', 'digital_illustration', 'forest_life', 'Detailed forest life illustration with wildlife'),
      v3('Natural Tones', 'digital_illustration', 'natural_tones', 'Earthy natural tones landscape painting'),
      v3('Real-Life Glow', 'digital_illustration', 'real_life_glow', 'Realistic scene with magical glowing elements'),
      v3('Retro Realism', 'digital_illustration', 'retro_realism', 'Retro-styled realistic illustration'),
      v3('Warm Folk', 'digital_illustration', 'warm_folk', 'Warm folk art illustration of rural life'),
      v3('Cutout', 'digital_illustration', 'cutout', 'Paper cutout style layered illustration'),
      v3('Depressive', 'digital_illustration', 'depressive', 'Moody atmospheric dark illustration'),
      v3('Editorial', 'digital_illustration', 'editorial', 'Magazine editorial illustration'),
      v3('Emotional flat', 'digital_illustration', 'emotional_flat', 'Emotional flat design illustration'),
      v3('Thin', 'digital_illustration', 'thin', 'Thin delicate line illustration'),
      v3('Translucent Gossamer', 'digital_illustration', 'translucent_gossamer', 'Translucent gossamer fabric-like ethereal art'),
    ],
  },
  {
    title: 'Legacy (V2)',
    subtitle: 'Classic Recraft V2 styles',
    styles: [
      v2('Line art', 'digital_illustration', 'line_art', 'Elegant line art drawing'),
      v2('Linocut', 'digital_illustration', 'linocut', 'Bold linocut print'),
      v2('Enterprise', 'realistic_image', 'enterprise', 'Corporate enterprise photography'),
      v2('Natural light', 'realistic_image', 'natural_light', 'Natural light portrait'),
      v2('Studio photo', 'realistic_image', 'studio_photo', 'Studio photo setup'),
      v2('HDR', 'realistic_image', 'hdr', 'HDR dramatic landscape'),
      v2('Hand-drawn', 'digital_illustration', 'hand_drawn', 'Hand-drawn sketch'),
      v2('Flat 2.0', 'digital_illustration', 'flat_2', 'Modern flat design illustration'),
      v2('Hard flash', 'realistic_image', 'hard_flash', 'Hard flash portrait'),
      v2('Grain', 'digital_illustration', 'grain', 'Grainy vintage illustration'),
      v2('Color blobs', 'digital_illustration', 'color_blobs', 'Abstract color blobs artwork'),
      v2('Bold Sketch', 'digital_illustration', 'bold_sketch', 'Bold sketched drawing'),
      v2('Motion blur', 'realistic_image', 'motion_blur', 'Motion blur action shot'),
      v2('Pencil sketch', 'digital_illustration', undefined, 'Pencil sketch portrait'),
      v2('Black & white', 'realistic_image', 'b_and_w', 'Black and white photography'),
      v2('Retro Pop', 'digital_illustration', 'retro_pop', 'Retro pop style art'),
      v2('Clay', 'digital_illustration', 'clay', 'Clay figurine style'),
      v2('Doodle Line art', 'digital_illustration', 'doodle_line_art', 'Casual doodle line drawings'),
      v2('Risograph', 'digital_illustration', 'risograph', 'Risograph print texture'),
      v2('Psychedelic', 'digital_illustration', 'psychedelic', 'Psychedelic swirling colors'),
      v2('Seamless Digital', 'digital_illustration', 'seamless', 'Seamless digital pattern'),
      v2('Seamless Vector', 'vector_illustration', 'seamless', 'Seamless vector pattern'),
      v2('Color engraving', 'digital_illustration', 'color_engraving', 'Color engraving botanical'),
      v2('Pixel art', 'digital_illustration', 'pixel_art', 'Retro pixel art scene'),
      v2("80's", 'digital_illustration', '80s', '1980s retro neon style'),
      v2('Engraving', 'digital_illustration', 'engraving', 'Classical engraving'),
      v2('Voxel art', 'digital_illustration', 'voxel_art', '3D voxel art scene'),
      v2('Bold Toon', 'digital_illustration', 'bold_toon', 'Bold cartoon toon style'),
      v2('Radiant Classicism', 'digital_illustration', 'radiant_classicism', 'Classical radiant art'),
      v2('Cloud Curves', 'digital_illustration', 'cloud_curves', 'Soft cloud curve abstract'),
      v2('Prism Aura', 'digital_illustration', 'prism_aura', 'Prismatic aura light effects'),
      v2('Sunburst Pop', 'digital_illustration', 'sunburst_pop', 'Sunburst pop art design'),
      v2('Cotton Bloom', 'digital_illustration', 'cotton_bloom', 'Soft cotton bloom floral'),
      v2('Urban Dreamscape', 'digital_illustration', 'urban_dreamscape', 'Urban dreamscape cityscape'),
      v2('Sugar Fade', 'digital_illustration', 'sugar_fade', 'Sweet sugar fade pastel'),
      v2('Pom Pom Pal', 'digital_illustration', 'pom_pom_pal', 'Cute pom pom character'),
      v2('Joyful Illustré', 'digital_illustration', 'joyful_illustre', 'Joyful illustrated scene'),
      v2('Cosmic Royalty', 'digital_illustration', 'cosmic_royalty', 'Cosmic royal themed art'),
      v2('Carnival Wool', 'digital_illustration', 'carnival_wool', 'Carnival wool craft style'),
    ],
  },
];

// Flat lookup: style name → StyleEntry (uses first occurrence for duplicates like "Illustration")
export const STYLE_LOOKUP: Record<string, StyleEntry> = {};
for (const cat of STYLE_CATEGORIES) {
  for (const style of cat.styles) {
    // For duplicate names (e.g. "Photorealism" appears in V2 and V3),
    // prefer V3 (first occurrence) since categories are ordered V3-first
    if (!STYLE_LOOKUP[style.name]) {
      STYLE_LOOKUP[style.name] = style;
    }
  }
}

// Build a unique key for styles that appear in multiple models
export function styleKey(name: string, model: string): string {
  return `${name}__${model}`;
}
