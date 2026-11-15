/**
 * Asset loading for 3D sets. Models are official NASA GLB files, Draco-compressed; the decoder is
 * served from our own origin (public/draco), so no request leaves the site (NFR-01, 10.6.6).
 */
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

import { asset } from '../content/assets';

export { asset };

let gltf: GLTFLoader | null = null;
function gltfLoader(): GLTFLoader {
  if (!gltf) {
    const draco = new DRACOLoader();
    draco.setDecoderPath(asset('draco/'));
    gltf = new GLTFLoader();
    gltf.setDRACOLoader(draco);
  }
  return gltf;
}

export const loadModel = (file: string): Promise<GLTF> => gltfLoader().loadAsync(asset(`assets/models/${file}`));

const textures = new THREE.TextureLoader();

/** `color` textures are sRGB; data textures (bump, alpha) are not. */
export async function loadTexture(path: string, color = true): Promise<THREE.Texture> {
  const t = await textures.loadAsync(asset(`assets/${path}`));
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
