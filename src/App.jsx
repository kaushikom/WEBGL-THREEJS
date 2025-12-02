// import React, { useRef, useMemo, useState, useEffect } from "react";
// import { Canvas, useFrame, useThree } from "@react-three/fiber";
// import * as THREE from "three";

// // Vertex shader for main image (with bulge effect)
// const mainVertexShader = `
//   varying vec2 vUv;
//   uniform vec3 uDisplacement;
//   uniform float uBulgeRadius;
//   uniform float uBulgeHeight;

//   float easeInOutCubic(float x) {
//     return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
//   }

//   float map(float value, float min1, float max1, float min2, float max2) {
//     return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
//   }

//   void main() {
//     vUv = uv;
//     vec3 newPosition = position;

//     vec4 worldPosition = modelMatrix * vec4(position, 1.0);
//     float dist = distance(uDisplacement.xy, worldPosition.xy);

//     if (dist < uBulgeRadius) {
//       float distanceMapped = map(dist, 0.0, uBulgeRadius, 1.0, 0.0);
//       float val = easeInOutCubic(distanceMapped) * uBulgeHeight;
//       newPosition.z += val;
//     }

//     gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
//   }
// `;

// // Vertex shader for shadow (no bulge - always flat)
// const shadowVertexShader = `
//   varying vec2 vUv;

//   void main() {
//     vUv = uv;
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//   }
// `;

// // Fragment shader
// const fragmentShader = `
//   varying vec2 vUv;
//   uniform sampler2D uTexture;
//   uniform vec3 uColor;
//   uniform float uOpacity;

//   void main() {
//     vec4 texColor = texture2D(uTexture, vUv);

//     if (texColor.a < 0.1) {
//       discard;
//     }

//     gl_FragColor = vec4(uColor, texColor.a * uOpacity);
//   }
// `;

// // Custom hook for texture loading
// const useTextureLoader = (url) => {
//   const [texture, setTexture] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const loader = new THREE.TextureLoader();
//     setLoading(true);

//     loader.load(
//       url,
//       (loadedTexture) => {
//         loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
//         loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
//         loadedTexture.minFilter = THREE.LinearFilter;
//         loadedTexture.magFilter = THREE.LinearFilter;
//         setTexture(loadedTexture);
//         setLoading(false);
//       },
//       undefined,
//       (err) => {
//         console.error("Texture loading error:", err);
//         setError(err);
//         setLoading(false);
//       }
//     );
//   }, [url]);

//   return { texture, loading, error };
// };

// // Camera Controller Component
// const CameraController = ({ cameraSettings }) => {
//   const { camera } = useThree();

//   useFrame(() => {
//     camera.position.set(
//       cameraSettings.positionX,
//       cameraSettings.positionY,
//       cameraSettings.positionZ
//     );

//     if (camera.isOrthographicCamera) {
//       camera.zoom = cameraSettings.zoom;
//       camera.updateProjectionMatrix();
//     }

//     camera.lookAt(0, 0, 0);
//   });

//   return null;
// };

// const IsometricScene = ({
//   mainImagePath = "/assets/text-main.png",
//   shadowImagePath = "/assets/text-shadow.png",
//   width = 10,
//   height = 10,
//   bulgeRadius = 3.0,
//   bulgeHeight = 0.8,
// }) => {
//   const mainMeshRef = useRef();
//   const [hoverPoint, setHoverPoint] = useState(
//     new THREE.Vector3(100, 100, 100)
//   );
//   const [isHovered, setIsHovered] = useState(false);

//   const { texture: mainTexture } = useTextureLoader(mainImagePath);
//   const { texture: shadowTexture } = useTextureLoader(shadowImagePath);

//   // Main material uniforms - with displacement
//   const mainUniforms = useMemo(
//     () => ({
//       uTexture: { value: mainTexture },
//       uDisplacement: { value: new THREE.Vector3(100, 100, 100) },
//       uColor: { value: new THREE.Color(0x000000) },
//       uOpacity: { value: 1.0 },
//       uBulgeRadius: { value: bulgeRadius },
//       uBulgeHeight: { value: bulgeHeight },
//     }),
//     [mainTexture]
//   );

//   // Shadow material uniforms
//   const shadowUniforms = useMemo(
//     () => ({
//       uTexture: { value: shadowTexture },
//       uColor: { value: new THREE.Color(0x000000) },
//       uOpacity: { value: 0.3 },
//     }),
//     [shadowTexture]
//   );

//   // Update uniforms when props change
//   useEffect(() => {
//     if (mainMeshRef.current) {
//       mainMeshRef.current.material.uniforms.uBulgeRadius.value = bulgeRadius;
//       mainMeshRef.current.material.uniforms.uBulgeHeight.value = bulgeHeight;
//     }
//   }, [bulgeRadius, bulgeHeight]);

//   // Animation frame
//   useFrame(() => {
//     if (mainMeshRef.current) {
//       if (isHovered) {
//         mainMeshRef.current.material.uniforms.uDisplacement.value.lerp(
//           hoverPoint,
//           0.1
//         );
//       } else {
//         mainMeshRef.current.material.uniforms.uDisplacement.value.set(
//           100,
//           100,
//           100
//         );
//       }
//     }
//   });

//   // Event handlers
//   const handlePointerMove = (event) => {
//     event.stopPropagation();
//     setHoverPoint(event.point);
//     setIsHovered(true);
//   };

//   const handlePointerLeave = () => {
//     setIsHovered(false);
//     setHoverPoint(new THREE.Vector3(100, 100, 100));
//   };

//   if (!mainTexture || !shadowTexture) {
//     return null;
//   }

//   return (
//     <group>
//       {/* Shadow Layer - at same Z position as main layer */}
//       <mesh position={[0, 0, 0]}>
//         <planeGeometry args={[width, height, 1, 1]} />
//         <shaderMaterial
//           vertexShader={shadowVertexShader}
//           fragmentShader={fragmentShader}
//           uniforms={shadowUniforms}
//           transparent={true}
//           depthWrite={false}
//           side={THREE.DoubleSide}
//         />
//       </mesh>

//       {/* Main Layer - at same Z position, will bulge upward on hover */}
//       <mesh
//         ref={mainMeshRef}
//         position={[0, 0, 0]}
//         onPointerMove={handlePointerMove}
//         onPointerLeave={handlePointerLeave}
//       >
//         <planeGeometry args={[width, height, 64, 64]} />
//         <shaderMaterial
//           vertexShader={mainVertexShader}
//           fragmentShader={fragmentShader}
//           uniforms={mainUniforms}
//           transparent={true}
//           side={THREE.DoubleSide}
//         />
//       </mesh>
//     </group>
//   );
// };

// // Bulge Controls Component
// const BulgeControls = ({ bulgeSettings, setBulgeSettings }) => {
//   const handleChange = (setting, value) => {
//     setBulgeSettings((prev) => ({
//       ...prev,
//       [setting]: parseFloat(value),
//     }));
//   };

//   const resetBulge = () => {
//     setBulgeSettings({
//       radius: 3.0,
//       height: 0.8,
//     });
//   };

//   return (
//     <div
//       style={{
//         position: "absolute",
//         bottom: "20px",
//         left: "50%",
//         transform: "translateX(-50%)",
//         background: "rgba(0, 0, 0, 0.8)",
//         color: "white",
//         padding: "15px",
//         borderRadius: "8px",
//         zIndex: 100,
//         minWidth: "300px",
//         backdropFilter: "blur(10px)",
//         border: "1px solid rgba(255, 255, 255, 0.2)",
//       }}
//     >
//       <h4 style={{ margin: "0 0 15px 0", textAlign: "center" }}>
//         Bulge Effect Controls
//       </h4>

//       <div style={{ marginBottom: "12px" }}>
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             marginBottom: "5px",
//           }}
//         >
//           <label style={{ fontWeight: "bold" }}>Diameter:</label>
//           <span>{bulgeSettings.radius.toFixed(1)}</span>
//         </div>
//         <input
//           type="range"
//           min="0.5"
//           max="8"
//           step="0.1"
//           value={bulgeSettings.radius}
//           onChange={(e) => handleChange("radius", e.target.value)}
//           style={{ width: "100%" }}
//         />
//       </div>

//       <div style={{ marginBottom: "12px" }}>
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             marginBottom: "5px",
//           }}
//         >
//           <label style={{ fontWeight: "bold" }}>Height:</label>
//           <span>{bulgeSettings.height.toFixed(1)}</span>
//         </div>
//         <input
//           type="range"
//           min="0.1"
//           max="3"
//           step="0.1"
//           value={bulgeSettings.height}
//           onChange={(e) => handleChange("height", e.target.value)}
//           style={{ width: "100%" }}
//         />
//       </div>

//       <button
//         onClick={resetBulge}
//         style={{
//           width: "100%",
//           padding: "8px",
//           background: "#e67e22",
//           color: "white",
//           border: "none",
//           borderRadius: "4px",
//           cursor: "pointer",
//         }}
//       >
//         Reset Bulge
//       </button>
//     </div>
//   );
// };

// // Main App Component
// export default function App() {
//   // Your specified settings
//   const rotation = {
//     x: 0,
//     y: 0,
//     z: (30 * Math.PI) / 180,
//   };

//   const cameraSettings = {
//     zoom: 100,
//     positionX: 0,
//     positionY: -30,
//     positionZ: 20,
//   };

//   // Bulge settings state
//   const [bulgeSettings, setBulgeSettings] = useState({
//     radius: 3.0,
//     height: 0.8,
//   });

//   return (
//     <div
//       style={{
//         width: "100%",
//         height: "100vh",
//         background: "transparent",
//         position: "relative",
//       }}
//     >
//       {/* Bulge Controls */}
//       <BulgeControls
//         bulgeSettings={bulgeSettings}
//         setBulgeSettings={setBulgeSettings}
//       />

//       <Canvas
//         orthographic
//         camera={{
//           position: [
//             cameraSettings.positionX,
//             cameraSettings.positionY,
//             cameraSettings.positionZ,
//           ],
//           zoom: cameraSettings.zoom,
//           near: 0.1,
//           far: 1000,
//         }}
//         onCreated={({ gl }) => {
//           gl.setClearColor(0x000000, 0);
//         }}
//         gl={{ alpha: true, antialias: true }}
//       >
//         <CameraController cameraSettings={cameraSettings} />

//         <ambientLight intensity={0.8} />
//         <directionalLight position={[10, 10, 5]} intensity={0.5} />

//         <group rotation={[rotation.x, rotation.y, rotation.z]}>
//           <IsometricScene
//             width={8}
//             height={8}
//             bulgeRadius={bulgeSettings.radius}
//             bulgeHeight={bulgeSettings.height}
//           />
//         </group>
//       </Canvas>
//     </div>
//   );
// }

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Vertex shader for main image (with bulge effect)
const mainVertexShader = `
  varying vec2 vUv;
  uniform vec3 uDisplacement;
  uniform float uBulgeRadius;
  uniform float uBulgeHeight;

  float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
  }

  float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
  }

  void main() {
    vUv = uv;
    vec3 newPosition = position;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    float dist = distance(uDisplacement.xy, worldPosition.xy);

    if (dist < uBulgeRadius) {
      float distanceMapped = map(dist, 0.0, uBulgeRadius, 1.0, 0.0);
      float val = easeInOutCubic(distanceMapped) * uBulgeHeight;
      newPosition.z += val;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Vertex shader for shadow (no bulge - always flat)
const shadowVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader
const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);

    if (texColor.a < 0.1) {
      discard;
    }

    gl_FragColor = vec4(uColor, texColor.a * uOpacity);
  }
`;

// Custom hook for texture loading
const useTextureLoader = (url) => {
  const [texture, setTexture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    setLoading(true);

    loader.load(
      url,
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        setTexture(loadedTexture);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("Texture loading error:", err);
        setError(err);
        setLoading(false);
      }
    );
  }, [url]);

  return { texture, loading, error };
};

// Camera Controller Component
const CameraController = ({ cameraSettings }) => {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.set(
      cameraSettings.positionX,
      cameraSettings.positionY,
      cameraSettings.positionZ
    );

    if (camera.isOrthographicCamera) {
      camera.zoom = cameraSettings.zoom;
      camera.updateProjectionMatrix();
    }

    camera.lookAt(0, 0, 0);
  });

  return null;
};

const IsometricScene = ({
  mainImagePath = "/assets/text-main3.png",
  shadowImagePath = "/assets/text-shadow3.png",
  width = 10,
  height = 10,
  bulgeRadius = 3.0,
  bulgeHeight = 0.8,
}) => {
  const mainMeshRef = useRef();

  // 1. FIXED: Use useRef for EVERYTHING involved in the animation loop
  // This bypasses the React render cycle completely for performance
  const hoverPoint = useRef(new THREE.Vector3(0, 0, 0));
  const isHoveredRef = useRef(false); // <--- Key fix: No more useState here
  const isFirstHover = useRef(true);

  const { texture: mainTexture } = useTextureLoader(mainImagePath);
  const { texture: shadowTexture } = useTextureLoader(shadowImagePath);

  const mainUniforms = useMemo(
    () => ({
      uTexture: { value: mainTexture },
      // Initialize effectively "off screen" but using the ref prevents the jump
      uDisplacement: { value: new THREE.Vector3(100, 100, 100) },
      uColor: { value: new THREE.Color(0x000000) },
      uOpacity: { value: 1.0 },
      uBulgeRadius: { value: bulgeRadius },
      uBulgeHeight: { value: bulgeHeight },
    }),
    [mainTexture]
  );

  const shadowUniforms = useMemo(
    () => ({
      uTexture: { value: shadowTexture },
      uColor: { value: new THREE.Color(0x000000) },
      uOpacity: { value: 0.3 },
    }),
    [shadowTexture]
  );

  useEffect(() => {
    if (mainMeshRef.current) {
      mainMeshRef.current.material.uniforms.uBulgeRadius.value = bulgeRadius;
      mainMeshRef.current.material.uniforms.uBulgeHeight.value = bulgeHeight;
    }
  }, [bulgeRadius, bulgeHeight]);

  useFrame(() => {
    if (mainMeshRef.current) {
      // 2. FIXED: Read from the refs immediately
      if (isHoveredRef.current) {
        if (isFirstHover.current) {
          // SNAP to position instantly on first frame
          mainMeshRef.current.material.uniforms.uDisplacement.value.copy(
            hoverPoint.current
          );
          isFirstHover.current = false;
        } else {
          // SMOOTHLY follow afterwards
          mainMeshRef.current.material.uniforms.uDisplacement.value.lerp(
            hoverPoint.current,
            0.1
          );
        }
      } else {
        // When leaving, snap away or lerp away.
        // To prevent the "fly in" on return, we reset isFirstHover in the event handler.
        mainMeshRef.current.material.uniforms.uDisplacement.value.lerp(
          new THREE.Vector3(100, 100, 100),
          0.1
        );
      }
    }
  });

  const handlePointerMove = (event) => {
    event.stopPropagation();
    // 3. FIXED: Update Refs directly. No state updates = No lag.
    hoverPoint.current.copy(event.point);
    isHoveredRef.current = true;
  };

  const handlePointerLeave = () => {
    isHoveredRef.current = false;
    isFirstHover.current = true; // Ensures we snap again next time we enter
  };

  if (!mainTexture || !shadowTexture) {
    return null;
  }

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width, height, 1, 1]} />
        <shaderMaterial
          vertexShader={shadowVertexShader}
          fragmentShader={fragmentShader}
          uniforms={shadowUniforms}
          transparent={true}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        ref={mainMeshRef}
        position={[0, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <planeGeometry args={[width, height, 64, 64]} />
        <shaderMaterial
          vertexShader={mainVertexShader}
          fragmentShader={fragmentShader}
          uniforms={mainUniforms}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// Bulge Controls Component
const BulgeControls = ({ bulgeSettings, setBulgeSettings }) => {
  const handleChange = (setting, value) => {
    setBulgeSettings((prev) => ({
      ...prev,
      [setting]: parseFloat(value),
    }));
  };

  const resetBulge = () => {
    setBulgeSettings({
      radius: 3.0,
      height: 0.8,
    });
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "15px",
        borderRadius: "8px",
        zIndex: 100,
        minWidth: "300px",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <h4 style={{ margin: "0 0 15px 0", textAlign: "center" }}>
        Bulge Effect Controls
      </h4>

      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <label style={{ fontWeight: "bold" }}>Diameter:</label>
          <span>{bulgeSettings.radius.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="8"
          step="0.1"
          value={bulgeSettings.radius}
          onChange={(e) => handleChange("radius", e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <label style={{ fontWeight: "bold" }}>Height:</label>
          <span>{bulgeSettings.height.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={bulgeSettings.height}
          onChange={(e) => handleChange("height", e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      <button
        onClick={resetBulge}
        style={{
          width: "100%",
          padding: "8px",
          background: "#e67e22",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Reset Bulge
      </button>
    </div>
  );
};

// Main App Component
export default function App() {
  // Your specified settings
  const rotation = {
    x: 0,
    y: 0,
    z: (30 * Math.PI) / 180,
  };

  const cameraSettings = {
    zoom: 100,
    positionX: 0,
    positionY: -30,
    positionZ: 20,
  };

  // Bulge settings state
  const [bulgeSettings, setBulgeSettings] = useState({
    radius: 1.6,
    height: 0.5,
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "transparent",
        position: "relative",
      }}
    >
      {/* Bulge Controls */}
      {/* <BulgeControls
        bulgeSettings={bulgeSettings}
        setBulgeSettings={setBulgeSettings}
      /> */}

      <Canvas
        orthographic
        camera={{
          position: [
            cameraSettings.positionX,
            cameraSettings.positionY,
            cameraSettings.positionZ,
          ],
          zoom: cameraSettings.zoom,
          near: 0.1,
          far: 1000,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        gl={{ alpha: true, antialias: true }}
      >
        <CameraController cameraSettings={cameraSettings} />

        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} />

        <group rotation={[rotation.x, rotation.y, rotation.z]}>
          <IsometricScene
            width={8}
            height={8}
            bulgeRadius={bulgeSettings.radius}
            bulgeHeight={bulgeSettings.height}
          />
        </group>
      </Canvas>
    </div>
  );
}
