import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Vertex shader for main image (with bulge effect)
const mainVertexShader = `
  varying vec2 vUv;
  uniform vec3 uDisplacement;

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

    float radius = 3.0;
    float maxHeight = 0.8;

    if (dist < radius) {
      float distanceMapped = map(dist, 0.0, radius, 1.0, 0.0);
      float val = easeInOutCubic(distanceMapped) * maxHeight;
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
    // No displacement - always flat
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Same fragment shader for both
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
    // Update camera position
    camera.position.set(
      cameraSettings.positionX,
      cameraSettings.positionY,
      cameraSettings.positionZ
    );

    // Update camera zoom for orthographic camera
    if (camera.isOrthographicCamera) {
      camera.zoom = cameraSettings.zoom;
      camera.updateProjectionMatrix();
    }

    // Update camera lookAt
    camera.lookAt(0, 0, 0);
  });

  return null;
};

const IsometricScene = ({
  mainImagePath = "/assets/text-main.png",
  shadowImagePath = "/assets/text-shadow.png",
  width = 10,
  height = 10,
}) => {
  const mainMeshRef = useRef();
  const [hoverPoint, setHoverPoint] = useState(
    new THREE.Vector3(100, 100, 100)
  );
  const [isHovered, setIsHovered] = useState(false);

  const { texture: mainTexture } = useTextureLoader(mainImagePath);
  const { texture: shadowTexture } = useTextureLoader(shadowImagePath);

  // Main material uniforms - with displacement
  const mainUniforms = useMemo(
    () => ({
      uTexture: { value: mainTexture },
      uDisplacement: { value: new THREE.Vector3(100, 100, 100) },
      uColor: { value: new THREE.Color(0x000000) },
      uOpacity: { value: 1.0 },
    }),
    [mainTexture]
  );

  // Shadow material uniforms - no displacement needed
  const shadowUniforms = useMemo(
    () => ({
      uTexture: { value: shadowTexture },
      uColor: { value: new THREE.Color(0x000000) },
      uOpacity: { value: 0.3 },
    }),
    [shadowTexture]
  );

  // Animation frame - only update main mesh
  useFrame(() => {
    if (mainMeshRef.current) {
      if (isHovered) {
        // Smooth transition when hovered
        mainMeshRef.current.material.uniforms.uDisplacement.value.lerp(
          hoverPoint,
          0.1
        );
      } else {
        // Immediate reset when not hovered
        mainMeshRef.current.material.uniforms.uDisplacement.value.set(
          100,
          100,
          100
        );
      }
    }
  });

  // Event handlers - only on main mesh
  const handlePointerMove = (event) => {
    event.stopPropagation();
    setHoverPoint(event.point);
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setHoverPoint(new THREE.Vector3(100, 100, 100));
  };

  // Don't render until textures are loaded
  if (!mainTexture || !shadowTexture) {
    return null;
  }

  return (
    <group>
      {/* Shadow Layer - Always flat, no interaction */}
      <mesh position={[0, 0, -0.1]}>
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

      {/* Main Layer - Interactive with bulge effect */}
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

// Rotation controls component
const RotationControls = ({ rotation, setRotation }) => {
  const handleRotationChange = (axis, value) => {
    setRotation((prev) => ({
      ...prev,
      [axis]: (value * Math.PI) / 180, // Convert degrees to radians
    }));
  };

  const resetToClassic = () => {
    setRotation({
      x: -Math.PI / 6, // -30 degrees
      y: Math.PI / 4, // 45 degrees
      z: 0,
    });
  };

  const resetToFlipped = () => {
    setRotation({
      x: Math.PI / 6, // 30 degrees
      y: -Math.PI / 4, // -45 degrees
      z: 0,
    });
  };

  const resetToTopDown = () => {
    setRotation({
      x: -Math.PI / 4, // -45 degrees
      y: Math.PI / 4, // 45 degrees
      z: 0,
    });
  };

  const resetToFront = () => {
    setRotation({
      x: 0,
      y: 0,
      z: 0,
    });
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "15px",
        borderRadius: "8px",
        zIndex: 100,
        minWidth: "250px",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <h4 style={{ margin: "0 0 15px 0", textAlign: "center" }}>
        Rotation Controls
      </h4>

      {["x", "y", "z"].map((axis) => (
        <div key={axis} style={{ marginBottom: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
            }}
          >
            <label style={{ textTransform: "uppercase", fontWeight: "bold" }}>
              {axis}-Axis:
            </label>
            <span>{Math.round((rotation[axis] * 180) / Math.PI)}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={(rotation[axis] * 180) / Math.PI}
            onChange={(e) =>
              handleRotationChange(axis, parseFloat(e.target.value))
            }
            style={{ width: "100%" }}
          />
        </div>
      ))}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "15px",
        }}
      >
        <button
          onClick={resetToClassic}
          style={{
            padding: "8px",
            background: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Classic Isometric
        </button>
        <button
          onClick={resetToFlipped}
          style={{
            padding: "8px",
            background: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Flipped (Fix Inversion)
        </button>
        <button
          onClick={resetToTopDown}
          style={{
            padding: "8px",
            background: "#2ecc71",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Top-Down View
        </button>
        <button
          onClick={resetToFront}
          style={{
            padding: "8px",
            background: "#f39c12",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Front View
        </button>
      </div>
    </div>
  );
};

// Camera controls component
const CameraControls = ({ cameraSettings, setCameraSettings }) => {
  const handleCameraChange = (setting, value) => {
    setCameraSettings((prev) => ({
      ...prev,
      [setting]: parseFloat(value),
    }));
  };

  const resetCamera = () => {
    setCameraSettings({
      zoom: 25,
      positionX: 0,
      positionY: 0,
      positionZ: 20,
    });
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "15px",
        borderRadius: "8px",
        zIndex: 100,
        minWidth: "250px",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <h4 style={{ margin: "0 0 15px 0", textAlign: "center" }}>
        Camera Controls
      </h4>

      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <label style={{ fontWeight: "bold" }}>Zoom:</label>
          <span>{cameraSettings.zoom}</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={cameraSettings.zoom}
          onChange={(e) => handleCameraChange("zoom", e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      {["X", "Y", "Z"].map((axis) => (
        <div key={axis} style={{ marginBottom: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
            }}
          >
            <label style={{ fontWeight: "bold" }}>Pos {axis}:</label>
            <span>{cameraSettings[`position${axis}`]}</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            step="1"
            value={cameraSettings[`position${axis}`]}
            onChange={(e) =>
              handleCameraChange(`position${axis}`, e.target.value)
            }
            style={{ width: "100%" }}
          />
        </div>
      ))}

      <button
        onClick={resetCamera}
        style={{
          width: "100%",
          padding: "8px",
          background: "#9b59b6",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginTop: "10px",
        }}
      >
        Reset Camera
      </button>

      <div
        style={{
          marginTop: "15px",
          fontSize: "12px",
          color: "#bbb",
          textAlign: "center",
        }}
      >
        <p>Move mouse over text to see bulge effect</p>
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  // State for rotation (in radians)
  const [rotation, setRotation] = useState({
    x: -Math.PI / 6, // -30 degrees
    y: Math.PI / 4, // 45 degrees
    z: 0,
  });

  // State for camera settings
  const [cameraSettings, setCameraSettings] = useState({
    zoom: 25,
    positionX: 0,
    positionY: 0,
    positionZ: 20,
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
      {/* Control Panels */}
      <RotationControls rotation={rotation} setRotation={setRotation} />
      <CameraControls
        cameraSettings={cameraSettings}
        setCameraSettings={setCameraSettings}
      />

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
        {/* Camera Controller - This makes the camera controls work */}
        <CameraController cameraSettings={cameraSettings} />

        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} />

        {/* Apply the rotation */}
        <group rotation={[rotation.x, rotation.y, rotation.z]}>
          <IsometricScene width={8} height={8} />
        </group>

        {/* Visual helpers */}
        <gridHelper
          args={[20, 20, 0x444444, 0x222222]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
        <axesHelper args={[5]} />
      </Canvas>
    </div>
  );
}
