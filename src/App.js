import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, Loader, Environment, useFBX, useAnimations, OrthographicCamera } from '@react-three/drei';
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial';

import { LineBasicMaterial, MeshPhysicalMaterial, Vector2 } from 'three';
import ReactAudioPlayer from 'react-audio-player';

import createAnimation from './converter';
import blinkData from './blendDataBlink.json';

import * as THREE from 'three';
import axios from 'axios';
import { SRGBColorSpace, LinearSRGBColorSpace } from 'three';

const _ = require('lodash');

const host = process.env.REACT_APP_BACKEND_URL || 'https://1bc69894-8a5c-4fc5-bb5d-6e967d277718-00-2oe1zx9rjbgp2.riker.replit.dev'

function Avatar({ avatar_url, speak, setSpeak, text, setAudioSource, playing }) {

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

  _.each([
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
    hairRoughnessTexture
  ], t => {
    t.colorSpace = SRGBColorSpace;
    t.flipY = false;
  });

  bodyNormalTexture.colorSpace = LinearSRGBColorSpace;
  tshirtNormalTexture.colorSpace = LinearSRGBColorSpace;
  teethNormalTexture.colorSpace = LinearSRGBColorSpace;
  hairNormalTexture.colorSpace = LinearSRGBColorSpace;

  
  gltf.scene.traverse(node => {


    if(node.type === 'Mesh' || node.type === 'LineSegments' || node.type === 'SkinnedMesh') {

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
        node.material = new LineBasicMaterial({color: 0x000000});
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

    if (speak === false)
      return;

    makeSpeech(text)
    .then( response => {

      let {blendData, filename}= response.data;

      let newClips = [ 
        createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'), 
        createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower') ];

      filename = host + filename;
        
      setClips(newClips);
      setAudioSource(filename);

    })
    .catch(err => {
      console.error(err);
      setSpeak(false);
      alert('Backend service not available. This app requires a separate backend service for text-to-speech functionality.\n\nThe backend can be found at: https://github.com/bornfree/talking_avatar_backend');
    })

  }, [speak]);

  let idleFbx = useFBX('/idle.fbx');
  let { clips: idleClips } = useAnimations(idleFbx.animations);

  idleClips[0].tracks = _.filter(idleClips[0].tracks, track => {
    return track.name.includes("Head") || track.name.includes("Neck") || track.name.includes("Spine2");
  });

  idleClips[0].tracks = _.map(idleClips[0].tracks, track => {

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

    let blinkClip = createAnimation(blinkData, morphTargetDictionaryBody, 'HG_Body');
    let blinkAction = mixer.clipAction(blinkClip);
    blinkAction.play();


  }, []);

  // Play animation clips when available
  useEffect(() => {

    if (playing === false)
      return;
    
    _.each(clips, clip => {
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
  return axios.post(host + '/talk', { text }).catch(error => {
    console.warn('Backend not available. This frontend requires a backend service for text-to-speech functionality.');
    console.warn('Backend repository: https://github.com/bornfree/talking_avatar_backend');
    throw error;
  });
}

const STYLES = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
    minHeight: '100vh',
    backgroundColor: '#000000'
  },
  avatarContainer: {
    width: '60vw',
    height: '33.75vw',
    border: '3px solid #555555',
    borderRadius: '15px',
    overflow: 'hidden',
    position: 'relative'
  },
  controlArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '10px',
    border: '1px solid #333333'
  },
  text: {
    margin: '0px',
    width: '400px',
    padding: '10px',
    background: '#2a2a2a',
    color: '#ffffff',
    fontSize: '1.2em',
    border: '1px solid #555555',
    borderRadius: '5px',
    resize: 'vertical'
  },
  speak: {
    padding: '12px 24px',
    marginTop: '5px',
    color: '#FFFFFF',
    background: '#333333',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1em'
  }
}

function App() {

  const audioPlayer = useRef();

  const [speak, setSpeak] = useState(false);
  const [text, setText] = useState("My name is Arwen. I'm a virtual human who can speak whatever you type here along with realistic facial movements.");
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
      {/* Avatar container with dark grey rounded border */}
      <div style={STYLES.avatarContainer}>
        <Canvas 
          dpr={2} 
          style={{width: '100%', height: '100%'}}
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
            <Environment background={false} files="/images/photo_studio_loft_hall_1k.hdr" />
          </Suspense>

          <Suspense fallback={null}>
            <Bg />
          </Suspense>

          <Suspense fallback={null}>
            <Avatar 
              avatar_url="/model.glb" 
              speak={speak} 
              setSpeak={setSpeak}
              text={text}
              setAudioSource={setAudioSource}
              playing={playing}
            />
          </Suspense>
        </Canvas>
        <Loader dataInterpolation={(p) => `Loading... please wait`}  />
      </div>

      {/* Text input area outside the bordered container */}
      <div style={STYLES.controlArea}>
        <textarea 
          rows={4} 
          style={STYLES.text} 
          value={text} 
          onChange={(e) => setText(e.target.value.substring(0, 200))} 
          placeholder="Enter text for the avatar to speak..."
        />
        <button 
          onClick={() => setSpeak(true)} 
          style={STYLES.speak}
          disabled={speak}
        > 
          {speak ? 'Running...' : 'Speak'} 
        </button>
      </div>

      <ReactAudioPlayer
        src={audioSource}
        ref={audioPlayer}
        onEnded={playerEnded}
        onCanPlayThrough={playerReady}
      />
    </div>
  )
}

function Bg() {
  
  const texture = useTexture('/images/bg.png');

  return(
    <mesh position={[0, 1.5, -2]} scale={[1.6, 0.9, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

export default App;
