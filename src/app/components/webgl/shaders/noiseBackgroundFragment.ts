export const noiseBackgroundFragment = `
  varying vec2 vUv;
  uniform float uTime;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    float n = random(vUv * 10.0 + uTime * 0.2); // 密度上げる
    float base = 0.06;          // 0.04〜0.10 あたりをお好みで
    float amp  = 0.14;          // 0.10〜0.20 あたりをお好みで
    vec3 color = vec3(base + amp * n);

    gl_FragColor = vec4(color, 1.0); // ここは不透明でOK
  }
`;
