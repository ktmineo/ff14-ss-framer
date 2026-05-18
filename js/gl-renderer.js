
export class GLRenderer {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        if (!this.gl) {
            console.error("WebGL not supported");
            throw new Error("WebGL not supported");
        }
        this.program = null;
        this.textures = {};
        this.buffers = {};
        this.init();
    }

    init() {
        const gl = this.gl;

        // Vertex Shader
        const vsSource = `
            attribute vec2 position;
            varying vec2 vUv;
            void main() {
                vUv = position * 0.5 + 0.5;
                vUv.y = 1.0 - vUv.y; // Flip Y for WebGL texture coords vs Canvas
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        // Fragment Shader (Application of 3D LUT)
        // Assuming LUT is efficient 2D slice layout or 3D texture if WebGL2?
        // For compatibility (WebGL1/2), simplest is often a 2D strip of slices.
        // But for simplicity in this specific "FilmSim" copy, we'll try to use 3D Textures if WebGL2 is available, 
        // or a standard 2D slice lookup if not. 
        // Let's stick to a 2D generic lookup for maximum compatibility first (LUT embedded in 2D image).
        // Standard LUT format: 64x64 grid of 64 slices? Or 512x512 image containing 64 64x64 slices.
        // Let's assume a standard "Square generic" LUT layout: sqrt(depth) * width, sqrt(depth) * height.
        // ACTUALLY: The simplest standard is often 512x512 image = 8x8 grid of 64x64 slices. (Total 64^3)
        // Or 256x16 image = linear strip of 16 slices of 16x16.

        // Let's implement for a "Strip" layout which is common (e.g. 256x16 for 16 sized, or 4096x64).
        // Or simpler: We can treat the LUT as a uniform array if it's small? No, too big.

        // Let's go with a standard 512x512 texture representing a 64x64x64 LUT (8x8 grid).

        const fsSource = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uImage;
            uniform sampler2D uLUT;
            uniform float uIntensity;
            
            // LUT settings
            // size: 64.0 (for 512x512 texture)
            #define LUT_SIZE 64.0
            #define LUT_SLICES_PER_ROW 8.0
            
            vec4 applyLUT(vec4 color) {
                float blueColor = color.b * (LUT_SIZE - 1.0);
                
                float quad1_y = floor(floor(blueColor) / LUT_SLICES_PER_ROW);
                float quad1_x = floor(blueColor) - (quad1_y * LUT_SLICES_PER_ROW);
                
                float quad2_y = floor(ceil(blueColor) / LUT_SLICES_PER_ROW);
                float quad2_x = ceil(blueColor) - (quad2_y * LUT_SLICES_PER_ROW);
                
                float texPos1_x = (quad1_x * LUT_SIZE) + 0.5 + (color.r * (LUT_SIZE - 1.0));
                float texPos1_y = (quad1_y * LUT_SIZE) + 0.5 + (color.g * (LUT_SIZE - 1.0));
                
                float texPos2_x = (quad2_x * LUT_SIZE) + 0.5 + (color.r * (LUT_SIZE - 1.0));
                float texPos2_y = (quad2_y * LUT_SIZE) + 0.5 + (color.g * (LUT_SIZE - 1.0));
                
                vec4 newColor1 = texture2D(uLUT, vec2(texPos1_x, texPos1_y) / (LUT_SIZE * LUT_SLICES_PER_ROW));
                vec4 newColor2 = texture2D(uLUT, vec2(texPos2_x, texPos2_y) / (LUT_SIZE * LUT_SLICES_PER_ROW));
                
                vec4 newColor = mix(newColor1, newColor2, fract(blueColor));
                return newColor;
            }

            void main() {
                vec4 texColor = texture2D(uImage, vUv); // No flip needed (VS handled it)
                vec4 lutColor = applyLUT(texColor);
                
                // Mix original with LUT based on intensity
                gl_FragColor = mix(texColor, lutColor, uIntensity);
            }
        `;

        this.program = this.createProgram(gl, vsSource, fsSource);

        // Quad buffer
        this.buffers.position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1,
        ]), gl.STATIC_DRAW);

        this.locations = {
            position: gl.getAttribLocation(this.program, 'position'),
            uImage: gl.getUniformLocation(this.program, 'uImage'),
            uLUT: gl.getUniformLocation(this.program, 'uLUT'),
            uIntensity: gl.getUniformLocation(this.program, 'uIntensity'),
        };
    }

    createProgram(gl, vsSource, fsSource) {
        const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createTexture(image) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        // Linear blending usually good for photo
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        return tex;
    }

    updateTexture(tex, image) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }

    // Expects: 
    // sourceImage: HTMLImageElement or Canvas
    // lutImage: HTMLImageElement or Canvas (Standard 512x512 Identity LUT format)
    // intensity: 0.0 to 1.0
    render(sourceImage, lutImage, intensity = 1.0) {
        const gl = this.gl;

        // Resize canvas to match source
        if (this.canvas.width !== sourceImage.width || this.canvas.height !== sourceImage.height) {
            this.canvas.width = sourceImage.width;
            this.canvas.height = sourceImage.height;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        gl.useProgram(this.program);

        // 1. Prepare/Update Textures (State agnostic, but might touch active unit)
        // Ensure Source Image Texture exists and is updated
        if (!this.textures.image) {
            this.textures.image = this.createTexture(sourceImage);
        } else {
            this.updateTexture(this.textures.image, sourceImage);
        }

        // Ensure LUT Texture exists and is updated
        if (!this.textures.lut) {
            this.textures.lut = this.createTexture(lutImage);
        } else {
            this.updateTexture(this.textures.lut, lutImage);
        }

        // 2. Bind Textures to Units (Strict Order)
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.image);
        gl.uniform1i(this.locations.uImage, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.lut);
        gl.uniform1i(this.locations.uLUT, 1);

        // Set Uniforms
        gl.uniform1f(this.locations.uIntensity, intensity);

        // Draw Quad
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.enableVertexAttribArray(this.locations.position);
        gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        return this.canvas;
    }
}
