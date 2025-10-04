import React, { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  useTexture,
  Loader,
  Environment,
  useFBX,
  useAnimations,
  OrthographicCamera,
} from "@react-three/drei";
import { MeshStandardMaterial } from "three/src/materials/MeshStandardMaterial";

import { LineBasicMaterial, MeshPhysicalMaterial, Vector2 } from "three";
import ReactAudioPlayer from "react-audio-player";

import createAnimation from "./converter";
import blinkData from "./blendDataBlink.json";

import * as THREE from "three";
import axios from "axios";
import { SRGBColorSpace, LinearSRGBColorSpace } from "three";

const _ = require("lodash");

const host =
  process.env.REACT_APP_BACKEND_URL ||
  "https://1bc69894-8a5c-4fc5-bb5d-6e967d277718-00-2oe1zx9rjbgp2.riker.replit.dev";

function Avatar({
  avatar_url,
  speak,
  setSpeak,
  text,
  setAudioSource,
  playing,
}) {
  let gltf = useGLTF(avatar_url);
  let morphTargetDictionaryBody = null;
  let morphTargetDictionaryLowerTeeth = null;

  const [
    bodyTexture,
    eyesTexture,
    teethTexture,
    bodySpecularTexture,
    bodyRoughnessTexture,
    bodyNormalTexture,
    teethNormalTexture,
    // teethSpecularTexture,
    hairTexture,
    tshirtDiffuseTexture,
    tshirtNormalTexture,
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture,
  ] = useTexture([
    "/images/body.webp",
    "/images/eyes.webp",
    "/images/teeth_diffuse.webp",
    "/images/body_specular.webp",
    "/images/body_roughness.webp",
    "/images/body_normal.webp",
    "/images/teeth_normal.webp",
    // "/images/teeth_specular.webp",
    "/images/h_color.webp",
    "/images/tshirt_diffuse.webp",
    "/images/tshirt_normal.webp",
    "/images/tshirt_roughness.webp",
    "/images/h_alpha.webp",
    "/images/h_normal.webp",
    "/images/h_roughness.webp",
  ]);

  _.each(
    [
      bodyTexture,
      eyesTexture,
      teethTexture,
      teethNormalTexture,
      bodySpecularTexture,
      bodyRoughnessTexture,
      bodyNormalTexture,
      tshirtDiffuseTexture,
      tshirtNormalTexture,
      tshirtRoughnessTexture,
      hairAlphaTexture,
      hairNormalTexture,
      hairRoughnessTexture,
    ],
    (t) => {
      t.colorSpace = SRGBColorSpace;
      t.flipY = false;
    },
  );

  bodyNormalTexture.colorSpace = LinearSRGBColorSpace;
  tshirtNormalTexture.colorSpace = LinearSRGBColorSpace;
  teethNormalTexture.colorSpace = LinearSRGBColorSpace;
  hairNormalTexture.colorSpace = LinearSRGBColorSpace;

  gltf.scene.traverse((node) => {
    if (
      node.type === "Mesh" ||
      node.type === "LineSegments" ||
      node.type === "SkinnedMesh"
    ) {
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;

      if (node.name.includes("Body")) {
        node.castShadow = true;
        node.receiveShadow = true;

        node.material = new MeshPhysicalMaterial();
        node.material.map = bodyTexture;
        // node.material.shininess = 60;
        node.material.roughness = 1.7;

        // node.material.specularMap = bodySpecularTexture;
        node.material.roughnessMap = bodyRoughnessTexture;
        node.material.normalMap = bodyNormalTexture;
        node.material.normalScale = new Vector2(0.6, 0.6);

        morphTargetDictionaryBody = node.morphTargetDictionary;

        node.material.envMapIntensity = 0.8;
        // node.material.visible = false;
      }

      if (node.name.includes("Eyes")) {
        node.material = new MeshStandardMaterial();
        node.material.map = eyesTexture;
        // node.material.shininess = 100;
        node.material.roughness = 0.1;
        node.material.envMapIntensity = 0.5;
      }

      if (node.name.includes("Brows")) {
        node.material = new LineBasicMaterial({ color: 0x000000 });
        node.material.linewidth = 1;
        node.material.opacity = 0.5;
        node.material.transparent = true;
        node.visible = false;
      }

      if (node.name.includes("Teeth")) {
        node.receiveShadow = true;
        node.castShadow = true;
        node.material = new MeshStandardMaterial();
        node.material.roughness = 0.1;
        node.material.map = teethTexture;
        node.material.normalMap = teethNormalTexture;

        node.material.envMapIntensity = 0.7;
      }

      if (node.name.includes("Hair")) {
        node.material = new MeshStandardMaterial();
        node.material.map = hairTexture;
        node.material.alphaMap = hairAlphaTexture;
        node.material.normalMap = hairNormalTexture;
        node.material.roughnessMap = hairRoughnessTexture;

        node.material.transparent = true;
        node.material.depthWrite = false;
        node.material.side = 2;
        node.material.color.setHex(0x000000);

        node.material.envMapIntensity = 0.3;
      }

      if (node.name.includes("TSHIRT")) {
        node.material = new MeshStandardMaterial();

        node.material.map = tshirtDiffuseTexture;
        node.material.roughnessMap = tshirtRoughnessTexture;
        node.material.normalMap = tshirtNormalTexture;
        node.material.color.setHex(0xffffff);

        node.material.envMapIntensity = 0.5;
      }

      if (node.name.includes("TeethLower")) {
        morphTargetDictionaryLowerTeeth = node.morphTargetDictionary;
      }
    }
  });

  const [clips, setClips] = useState([]);
  const mixer = useMemo(() => new THREE.AnimationMixer(gltf.scene), []);

  useEffect(() => {
    if (speak === false) return;

    makeSpeech(text)
      .then((response) => {
        let { blendData, filename } = response.data;

        let newClips = [
          createAnimation(blendData, morphTargetDictionaryBody, "HG_Body"),
          createAnimation(
            blendData,
            morphTargetDictionaryLowerTeeth,
            "HG_TeethLower",
          ),
        ];

        filename = host + filename;

        setClips(newClips);
        setAudioSource(filename);
      })
      .catch((err) => {
        console.error(err);
        setSpeak(false);
        alert(
          "Backend service not available. This app requires a separate backend service for text-to-speech functionality.\n\nThe backend can be found at: https://github.com/bornfree/talking_avatar_backend",
        );
      });
  }, [speak]);

  let idleFbx = useFBX("/idle.fbx");
  let { clips: idleClips } = useAnimations(idleFbx.animations);

  idleClips[0].tracks = _.filter(idleClips[0].tracks, (track) => {
    return (
      track.name.includes("Head") ||
      track.name.includes("Neck") ||
      track.name.includes("Spine2")
    );
  });

  idleClips[0].tracks = _.map(idleClips[0].tracks, (track) => {
    if (track.name.includes("Head")) {
      track.name = "head.quaternion";
    }

    if (track.name.includes("Neck")) {
      track.name = "neck.quaternion";
    }

    if (track.name.includes("Spine")) {
      track.name = "spine2.quaternion";
    }

    return track;
  });

  useEffect(() => {
    let idleClipAction = mixer.clipAction(idleClips[0]);
    idleClipAction.play();

    let blinkClip = createAnimation(
      blinkData,
      morphTargetDictionaryBody,
      "HG_Body",
    );
    let blinkAction = mixer.clipAction(blinkClip);
    blinkAction.play();
  }, []);

  // Play animation clips when available
  useEffect(() => {
    if (playing === false) return;

    _.each(clips, (clip) => {
      let clipAction = mixer.clipAction(clip);
      clipAction.setLoop(THREE.LoopOnce);
      clipAction.play();
    });
  }, [playing]);

  useFrame((state, delta) => {
    mixer.update(delta);
  });

  return (
    <group name="avatar">
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}

function makeSpeech(text) {
  return axios.post(host + "/talk", { text }).catch((error) => {
    console.warn(
      "Backend not available. This frontend requires a backend service for text-to-speech functionality.",
    );
    console.warn(
      "Backend repository: https://github.com/bornfree/talking_avatar_backend",
    );
    throw error;
  });
}

const STYLES = {
  container: {
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    minHeight: "100vh",
    backgroundColor: "#000000",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "20px",
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto 20px auto",
  },
  timeDisplay: {
    fontSize: "0.9em",
    color: "#CCCCCC",
    alignSelf: "flex-start",
    marginTop: "5px",
    marginLeft: "0px",
  },
  mainContent: {
    display: "flex",
    gap: "30px",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    flex: 1,
  },
  sidebar: {
    width: "250px",
    padding: "20px",
    backgroundColor: "#1a1a1a",
    borderRadius: "10px",
    border: "1px solid #333333",
  },
  sidebarItem: {
    marginBottom: "15px",
  },
  sidebarLabel: {
    fontSize: "0.85em",
    color: "#CCCCCC",
    fontWeight: "bold",
    marginBottom: "5px",
  },
  sidebarValue: {
    fontSize: "0.9em",
    color: "#FFFFFF",
    marginLeft: "10px",
  },
  sidebarValueLarge: {
    fontSize: "1.8em",
    color: "#FFFFFF",
    marginLeft: "10px",
    fontWeight: "bold",
  },
  avatarContainer: {
    width: "600px",
    aspectRatio: "16/9",
    border: "3px solid #555555",
    borderRadius: "15px",
    overflow: "hidden",
    position: "relative",
    backgroundImage: "url(/images/bg.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },
  controlArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "20px",
    backgroundColor: "#1a1a1a",
    borderRadius: "10px",
    border: "1px solid #333333",
    width: "600px",
  },
  controlRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: "100%",
  },
  timeDisplayBottom: {
    fontSize: "0.9em",
    color: "#CCCCCC",
  },
  timeLabel: {
    color: "#00ff00",
  },
  text: {
    margin: "0px",
    width: "560px",
    padding: "10px",
    background: "#2a2a2a",
    color: "#ffffff",
    fontSize: "1.2em",
    border: "1px solid #555555",
    borderRadius: "5px",
    resize: "vertical",
  },
  speak: {
    padding: "12px 24px",
    marginTop: "5px",
    color: "#FFFFFF",
    background: "#333333",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "1em",
  },
  title: {
    fontSize: "2.5em",
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: "5px",
    textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
  },
  characterSection: {
    fontSize: "1.4em",
    color: "#FFFFFF",
    textAlign: "center",
    margin: "5px 0",
    padding: "10px",
    backgroundColor: "#2a2a2a",
    borderRadius: "8px",
    border: "1px solid #444444",
  },
  statsSection: {
    fontSize: "1.1em",
    color: "#CCCCCC",
    textAlign: "center",
    margin: "20px 0",
    padding: "15px",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    border: "1px solid #333333",
    fontFamily: "monospace",
  },
  recordingOverlay: {
    position: "absolute",
    top: "15px",
    left: "15px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    zIndex: 1000,
  },
  recordingDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    backgroundColor: "#ff0000",
    animation: "flash 1s infinite",
  },
  recordingText: {
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "bold",
    fontFamily: "monospace",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
  },
};

function App() {
  const audioPlayer = useRef();

  const [speak, setSpeak] = useState(false);
  const [text, setText] = useState(
    "I'm cooking up a storm and I hear you have Hello Fresh coming on Tuesday. Cook up a storm, I have my own restaurant to run. I'm serving Sienna style garlic bread tonight.",
  );
  const [audioSource, setAudioSource] = useState(null);
  const [playing, setPlaying] = useState(false);

  // End of play
  function playerEnded(e) {
    setAudioSource(null);
    setSpeak(false);
    setPlaying(false);
  }

  // Player is read
  function playerReady(e) {
    audioPlayer.current.audioEl.current.play();
    setPlaying(true);
  }

  return (
    <div style={STYLES.container}>
      {/* Header section */}
      <div style={STYLES.header}>
        <div style={STYLES.title}>Conversation Engine</div>
      </div>

      {/* Main content area with sidebar */}
      <div style={STYLES.mainContent}>
        {/* Left column */}
        <div style={STYLES.leftColumn}>
          {/* Avatar container */}
          <div style={STYLES.avatarContainer}>
            {/* Recording indicator overlay */}
            <div style={STYLES.recordingOverlay}>
              <div style={STYLES.recordingDot}></div>
              <div style={STYLES.recordingText}>REC</div>
            </div>

            <Canvas
              dpr={2}
              style={{ width: "100%", height: "100%" }}
              onCreated={(ctx) => {
                ctx.gl.physicallyCorrectLights = true;
              }}
            >
              <OrthographicCamera
                makeDefault
                zoom={1000}
                position={[0, 1.65, 1]}
              />

              <Suspense fallback={null}>
                <Environment
                  background={false}
                  files="/images/photo_studio_loft_hall_1k.hdr"
                />
              </Suspense>

              {/* Avatar temporarily hidden 
              <Suspense fallback={null}>
                <Avatar 
                  avatar_url="/model.glb" 
                  speak={speak} 
                  setSpeak={setSpeak}
                  text={text}
                  setAudioSource={setAudioSource}
                  playing={playing}
                />
              </Suspense> */}
            </Canvas>
            <Loader dataInterpolation={(p) => `Loading... please wait`} />
          </div>

          {/* Text input controls */}
          <div style={STYLES.controlArea}>
            <textarea
              rows={4}
              style={STYLES.text}
              value={text}
              onChange={(e) => setText(e.target.value.substring(0, 200))}
              placeholder="Enter text for the avatar to speak..."
            />
            <div style={STYLES.controlRow}>
              <button
                onClick={() => setSpeak(true)}
                style={STYLES.speak}
                disabled={speak}
              >
                {speak ? "Running..." : "Speak"}
              </button>
              <div style={STYLES.timeDisplayBottom}>
                <span style={STYLES.timeLabel}>Time:</span> 2:13pm
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={STYLES.sidebar}>
          <div style={STYLES.sidebarItem}>
            <div style={STYLES.sidebarLabel}>Character:</div>
            <div style={STYLES.sidebarValueLarge}>supabase_field</div>
          </div>

          <div style={STYLES.sidebarItem}>
            <div style={STYLES.sidebarLabel}>Current Mood:</div>
            <div style={STYLES.sidebarValue}>0.67</div>
          </div>

          <div style={STYLES.sidebarItem}>
            <div style={STYLES.sidebarLabel}>AI Model:</div>
            <div style={STYLES.sidebarValue}>Gpt-5</div>
          </div>

          <div style={STYLES.sidebarItem}>
            <div style={STYLES.sidebarLabel}>Message Count:</div>
            <div style={STYLES.sidebarValueLarge}>16</div>
          </div>

          <div style={STYLES.sidebarItem}>
            <div style={STYLES.sidebarLabel}>Chat Started:</div>
            <div style={STYLES.sidebarValue}>Sept 30th 1:37pm</div>
          </div>
        </div>
      </div>

      <ReactAudioPlayer
        src={audioSource}
        ref={audioPlayer}
        onEnded={playerEnded}
        onCanPlayThrough={playerReady}
      />
    </div>
  );
}

export default App;
