(function (window) {
    function makeProgram(gl, vshader, fshader) {
        var fs = gl.createShader(gl.FRAGMENT_SHADER),
            vs = gl.createShader(gl.VERTEX_SHADER),
            pr;
            gl.shaderSource(vs, vshader);
            gl.shaderSource(fs, fshader);
            gl.compileShader(vs);
            gl.compileShader(fs);
            if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)){
                console.log(gl.getShaderInfoLog(fs));
                return 0;
            }

            pr = gl.createProgram();
            gl.attachShader(pr, vs);
            gl.attachShader(pr, fs);
            gl.linkProgram(pr);
            return pr;
    }
    
    function initGL(canvasElement, antialias) {
        var anti = (antialias === undefined) ? true : antialias,
            gl = canvasElement.getContext('webgl', {antialias:anti}) || canvasElement.getContext('experimental-webgl', {antialias: anti});
        if (gl == null) {
            console.error('Not supported webgl');
            return null;
        }
       
		
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        canvasElement.addEventListener('webglcontextlost', function(){
            // context is lost
        }, false);

        canvasElement.addEventListener('webglcontextrestored', function(){
            // context is restored
        }, false);
        return gl;
    }
    
    function mainloop(drawfunc) {
        window.requestAnimFrame = (function(){
            return  window.requestAnimationFrame       ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame    ||
                function( callback ){
                    window.setTimeout(callback, 1000 / 60);
                };
        })();
        (function animloop(){
            window.requestAnimFrame(animloop);
            drawfunc();
        })();
    }
    
    //--------------
    
    function ShaderProgram(gl) {
        this.gl = gl;
        this.prg = 0;
    }
    ShaderProgram.prototype = {
        create: function (vs, fs) {
            this.prg = makeProgram(this.gl, vs, fs);  
        },
        getProgram: function () {
            return this.prg;
        },
        bind: function () {
            this.gl.useProgram(this.prg);
        },
        unbind: function () {
            // this.gl.useProgram(0); // if you need, use.
        },
        setInt: function (name, val) {
            var loc = this.gl.getUniformLocation(this.prg, name);
            if (loc !== null) {
                this.gl.uniform1i(loc, val);                
            }
        },
        setFloat: function (name, val) {
            var loc = this.gl.getUniformLocation(this.prg, name);
            if (loc !== null) {
                this.gl.uniform1f(loc, val);                
            }
        },
        setVec2: function (name, x, y) {
            var loc = this.gl.getUniformLocation(this.prg, name);
            if (loc !== null) {
                this.gl.uniform2fv(loc, [x, y]);
            }
        },
        setVec3: function (name, x, y, z) {
            var loc = this.gl.getUniformLocation(this.prg, name);
            if (loc !== null) {
                this.gl.uniform3fv(loc, [x, y, z]);
            }
        },
        setVec4: function (name, x, y, z, w) {
            var loc = this.gl.getUniformLocation(this.prg, name);
            if (loc !== null) {
                this.gl.uniform4fv(loc, [x, y, z, w]);
            }
        },
        setMat4: function (name, mat) {
            var loc = this.gl.getUniformLocation(this.prg, name);
            if (loc !== null) {
                this.gl.uniformMatrix4fv(loc, false, mat);
            }
        },
        setMat3: function (name, mat) {
            var loc = this.gl.getUniformLocation(this.prg, name);
            if (loc !== null) {
                this.gl.uniformMatrix3fv(loc, false, mat);
            }
        },
        setMat2: function (name, mat) {
            var loc = this.gl.getUniformLocation(this.prg, name);
            if (loc !== null) {
                this.gl.uniformMatrix2fv(loc, false, mat);
            }
        },
        release: function () {
            this.gl.deleteProgram(this.prg);
            this.prg = 0;
        },
        setAttrib: function (varyingName, vertexBuffer) {
            var attr = this.gl.getAttribLocation(this.prg, varyingName);
            if (attr !== null) {
                this.gl.bindBuffer(vertexBuffer.arrayMode, vertexBuffer.buffer);
                this.gl.enableVertexAttribArray(attr);
                this.gl.vertexAttribPointer(attr, vertexBuffer.getElementSize(), this.gl.FLOAT, false, 0, 0);
            }
        }
    };
    
    //-----------------------
    function BufferObject(gl) {
        this.gl = gl;
        this.buffer = 0;
        this.num = 0;
        this.elementSize = 0;
        this.num = 0;
        this.arrayMode = 0;
        this.indexType = 0;
        this.buffer = this.gl.createBuffer();
    }
    
    function drawIndex(thisptr, primitiveMode) {
        thisptr.gl.bindBuffer(thisptr.gl.ELEMENT_ARRAY_BUFFER, thisptr.buffer);
        thisptr.gl.drawElements(primitiveMode, thisptr.elementNum, thisptr.indexType, 0);
    }
    function drawArray(thisptr, primitiveMode) {
        thisptr.gl.drawArrays(primitiveMode, 0, thisptr.elementNum);
    }
        
    BufferObject.prototype = {
        write: function (arrayMode, arrayBuffer, elementNum) {
            var esize = arrayBuffer.byteLength / arrayBuffer.length;
             if (arrayMode === this.gl.ELEMENT_ARRAY_BUFFER) {
                this.drawFunc = drawIndex;
                if (esize === 2) {
                    this.indexType = this.gl.UNSIGNED_SHORT;
                } else if (esize === 4) {
                    this.indexType = this.gl.UNSIGNED_INT;    
                } else {
                    console.error('Unknow BufferObject size.', esize);
                }
            } else {
                this.drawFunc = drawArray;
            }
            this.arrayMode = arrayMode;
            this.elementSize = arrayBuffer.length / elementNum;
            this.elementNum = elementNum;
            this.gl.bindBuffer(arrayMode, this.buffer);
            this.gl.bufferData(arrayMode, arrayBuffer, this.gl.STATIC_DRAW);
        },
        getNum: function () {
            return this.elementNum;
        },
        createFromArrayBuffer: function (arrayBuffer) {
            // TODO       
        },
        release: function() {
            this.deleteBuffer(this.buffer);
            this.buffer = null;
        },
        getElementSize: function () {
            return this.elementSize;
        },
        draw: function (primitiveMode) {
            this.drawFunc(this, primitiveMode);
        }
    };
    //-----------------------
    function Texture(gl) {
        this.gl = gl;
        this.texture_ = gl.createTexture();
        this.width_ = 0;
        this.height_ = 0;
        this.bufferType_ = gl.RGBA;
        this.updateFilter();
    }
        
    Texture.prototype = {
        updateFilter: function () {
            var gl = this.gl;
            gl.bindTexture(gl.TEXTURE_2D, this.texture_);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        },
        writeFromArray: function (bufferType, width, height, arrayBuffer) {
            var gl = this.gl;
            this.width_ = width;
            this.height_ = height;
            this.bufferType_ = bufferType;
            gl.bindTexture(gl.TEXTURE_2D, this.texture_);
            gl.texImage2D(gl.TEXTURE_2D, 0, this.bufferType_, width, height, this.bufferType_, gl.UNSIGNED_BYTE, arrayBuffer);
        },
        writeFromCanvas: function (canvas) {
            var gl = this.gl;
            this.width_ = canvas.width;
            this.height_ = canvas.height;
            this.bufferType_ = gl.RGBA;
            gl.bindTexture(gl.TEXTURE_2D, this.texture_);
            gl.texImage2D(gl.TEXTURE_2D, 0, this.bufferType_, this.bufferType_, gl.UNSIGNED_BYTE, canvas);
        },
        getWidth: function () {
            return this.width_;
        },
        getHeight: function () {
            return this.height_;
        },
        getTexture: function () {
            return this.texture_;  
        },
        release: function() {
            this.deleteTexture(this.texture_);
            this.width_ = 0;
            this.height_ = 0;            
            this.texture_ = null;
        },
        bind: function () {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_);
        },
        unbind: function () {
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        },
        generateMipmap: function () {
            this.gl.generateMipmap(this.gl.TEXTURE_2D);
        }
        
    };
    
    //-----------------------
    function RenderTarget(gl) {
        this.gl = gl;
        this.colorTexture_ = new Texture(gl);
        this.depthTexture_ = null;
        this.depthRenderBuffer_ = gl.createRenderbuffer();
        this.frameBuffer_ = gl.createFramebuffer();
        this.bufferType  = gl.RGBA;
        this.bufferComponent = gl.UNSIGNED_BYTE;
    }
        
    RenderTarget.prototype = {
        create: function (width, height, bufferType, bufferComponent) {
            var gl = this.gl;
            this.width = width;
            this.height = height;
            if (bufferType) {
                this.bufferType = bufferType;
            }
            if (bufferComponent) {
                this.bufferComponent = bufferComponent;
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer_);            
            
            // color
            gl.bindTexture(gl.TEXTURE_2D, this.colorTexture_.getTexture());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
            gl.texImage2D(gl.TEXTURE_2D, 0, bufferType, width, height, 0, bufferType, bufferComponent, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture_.getTexture(), 0);
            // depth
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRenderBuffer_);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRenderBuffer_);                        
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        },
        release: function() {
            var gl = this.gl;
            gl.deleteFrameBuffer(this.frameBuffer_);
            gl.deleteTexture(this.colorTexture_);
            if (this.depthTexture_) {
                gl.deleteTexture(this.depthTexture_);
            }
            gl.deleteRenderbuffer(this.depthRenderBuffer_);
            this.buffer = null;
        },
        bind: function () {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer_);
        },
        unbind: function () {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        },
        getColorTexture: function () {
            return this.colorTexture_;
        },
        getDepthTexture: function () {
            return this.depthTexture_;
        }     
    };
    
    //-----------------------------------------------------------------------------
    
    function STRINGFY(func) {
        return func.toString().match(/\n([\s\S]*)\n/)[1];
    }
    
    window.vgl = {
        initGL: initGL,
        mainloop: mainloop,
        BufferObject: BufferObject,
        ShaderProgram: ShaderProgram,
        Texture: Texture,
        RenderTarget: RenderTarget,
        STRINGFY: STRINGFY
    }
}(window));