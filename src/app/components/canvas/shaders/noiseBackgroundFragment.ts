export const noiseBackgroundFragment = `
  varying vec2 vUv;
  uniform float uTime;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    float n = random(vUv * 10.0 + uTime * 0.2); // 密度上げる
    gl_FragColor = vec4(vec3(n), 0.1); // ← ここを 0.07〜0.1 にUP
  }
`;
