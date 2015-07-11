/*jslint devel:true */
/*global vgl*/
(function (window) {
    var compileMode = '',
        userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('chrome') != -1) {
        compileMode = 'uniform';
    } else if (userAgent.indexOf('safari') != -1) {
        compileMode = 'uniform';    
    }
    
    var initVS = vgl.STRINGFY(function () {/*
    	// vertex shader
        precision highp float;
    	attribute vec4 position;
        varying vec2 uv;
    	void main() {
    		gl_Position = position;
            uv = position.xy * vec2(0.5, 0.5) + vec2(0.5);
    	}
    */}),
        initFS = vgl.STRINGFY(function () {/*
    	// fragment shader
     	precision highp float;
        uniform sampler2D tex;
        varying vec2 uv;
        void main() {
            vec4 col = texture2D(tex, uv);
            vec3 m = vec3(0.299, 0.587, 0.114);
            float y = dot(m, col.xyz);
    		gl_FragColor = vec4(y, y, y, 1.0);
     	}
    */});

    var copyVS = vgl.STRINGFY(function () {/*
    	// vertex shader
        precision highp float;
    	attribute vec4 position;
        varying vec2 uv;
    	void main() {
    		gl_Position = position;
            uv = position.xy * vec2(0.5, 0.5) + vec2(0.5);
    	}
    */}),
        copyFS = vgl.STRINGFY(function () {/*
    	// fragment shader
     	precision highp float;
        uniform sampler2D tex;
        varying vec2 uv;
        void main() {
    		gl_FragColor = texture2D(tex, uv);
     	}
    */});

    
    var rgbVS = vgl.STRINGFY(function () {/*
    	// vertex shader
        precision highp float;
    	attribute vec4 position;
        varying vec2 uv;
    	void main() {
    		gl_Position = position;
            uv = position.xy * vec2(0.5, -0.5) + vec2(0.5);
    	}
    */}),
    rgbFS = vgl.STRINGFY(function () {/*
    	// fragment shader
     	precision highp float;
        uniform sampler2D tex;
        uniform sampler2D orgtex;
        varying vec2 uv;
            
        vec4 RGB2YUV(vec4 c) {
            float Y = dot(vec3( 0.299, 0.587, 0.114), c.rgb);
            float U = dot(vec3(-0.147,-0.289, 0.436), c.rgb);
            float V = dot(vec3( 0.615,-0.515,-0.100), c.rgb);
            return vec4(Y,U,V,c.a);
        }
                
        vec4 YUV2RGB(vec4 c)
        {
            float R = dot(vec3( 1.000, 0.000, 1.140), c.rgb);
            float G = dot(vec3( 1.000,-0.395,-0.580), c.rgb);
            float B = dot(vec3( 1.000, 2.032, 0.000), c.rgb);
            return vec4(R,G,B,c.a);
        }

        void main(){
            vec4 col  = texture2D(orgtex, fract(uv));
            vec4 yuv = RGB2YUV(col);
            yuv.x =  texture2D(tex, fract(uv*vec2(1.0/16.0, 1.0/8.0))).x;
            gl_FragColor = YUV2RGB(yuv);
     	}
    */});


    var convVS = vgl.STRINGFY(function () {/*
    	// vertex shader
        precision highp float;
    	attribute vec4 position;
        varying vec2 uv;
    	void main() {
    		gl_Position = position;
            uv = position.xy * vec2(0.5, 0.5) + vec2(0.5);
            uv *= vec2(1.0/16.0, 1.0/8.0);
    	}
    */});

    //----------------------------------------------------

    function dispMsg(msg) {
        var dmsg = document.getElementById('msg');
        dmsg.innerHTML = msg;
    }
        
    window.onload = function () {
        var c = document.getElementById('c'),
            inputimage = document.getElementById('ic'),
            g = vgl.initGL(c, false),
            si,
            convpr = [],              
            model = {},
            initpr, copypr, rgbpr, vb;
        
        if (g === null) {
            alert('Not supported WebGL');
        }    
            
        initpr = new vgl.ShaderProgram(g),
        copypr = new vgl.ShaderProgram(g),
        rgbpr  = new vgl.ShaderProgram(g),
        vb = new vgl.BufferObject(g);
      
        function noWarn(msg) { }
        function errorReport(msg) { alert(msg); }
	    function ifErrorReport(err, msg) {
		      err ? noWarn(msg) : errorReport(msg);
	    }
		var ext;
		ext = g.getExtension("OES_texture_float");
		ifErrorReport(ext, "Not support OES_texture_float");
		
        function createPrograms(model, enableClamp) {
            var convsize = model.length,
                i,
                inputtable = [];
            convpr = [convsize];
            
            for (i = 0; i < convsize; i = i + 1) {
                inputtable.push(model[i].nInputPlane);
            }
            
            initpr.create(initVS, initFS);
        	copypr.create(copyVS, copyFS);
            rgbpr.create(rgbVS, rgbFS);
            var fs, ioffset = [4], ip;
            for (si = 0; si < convsize; ++si) {
                fs = [];
                fs.push('#define INPUTPLANE ' + inputtable[si] );
                fs.push('precision highp float;');
                fs.push('uniform sampler2D tex;');
                fs.push('uniform mat3 weight[128];');
                fs.push('uniform vec2 pixSize;');
                fs.push('uniform float bias;');
                fs.push('varying vec2 uv;');
                if (compileMode === 'unifrom') {
    	            fs.push("uniform vec4 inputOffset[" + inputtable[si] + "];");
                }
                fs.push('void main() {');
                if (compileMode !== 'unifrom') {
                    fs.push("vec4 inputOffset[" + inputtable[si] + "];");
                    for (ip = 0; ip < inputtable[si]; ip = ip + 1) {
                        ioffset[0] = (ip % 16) / 16.0;
                        ioffset[1] = Math.floor(ip / 16.0) / 8.0;
                        ioffset[2] = Math.max(0.0, ioffset[0] + 1.0 / 16.0 - 0.000001);
                        ioffset[3] = Math.max(0.0, ioffset[1] + 1.0 / 8.0 - 0.000001);
                        fs.push("inputOffset[" + ip + "] = vec4(" + ioffset[0] + ","+ ioffset[1] + ","+ ioffset[2] + ","+ ioffset[3] + ");");
                    }
                }
                fs.push('float sum = 0.0;');
                fs.push('for (int i = 0; i < INPUTPLANE; ++i) {');
                fs.push('vec2 tuv = uv + inputOffset[i].xy;');
                fs.push('mat3 pix = mat3(');
                if (enableClamp) {
                    fs.push('    vec3(texture2D(tex, min(max(tuv + vec2(-pixSize.x, -pixSize.y), inputOffset[i].xy), inputOffset[i].zw) ).x,');
                    fs.push('         texture2D(tex, min(max(tuv + vec2(         0, -pixSize.y), inputOffset[i].xy), inputOffset[i].zw) ).x,');
                    fs.push('         texture2D(tex, min(max(tuv + vec2( pixSize.x, -pixSize.y), inputOffset[i].xy), inputOffset[i].zw) ).x),');
                    fs.push('    vec3(texture2D(tex, min(max(tuv + vec2(-pixSize.x,          0), inputOffset[i].xy), inputOffset[i].zw) ).x,');
                    fs.push('         texture2D(tex, min(max(tuv + vec2(         0,          0), inputOffset[i].xy), inputOffset[i].zw) ).x,');
                    fs.push('         texture2D(tex, min(max(tuv + vec2( pixSize.x,          0), inputOffset[i].xy), inputOffset[i].zw) ).x),');
                    fs.push('    vec3(texture2D(tex, min(max(tuv + vec2(-pixSize.x,  pixSize.y), inputOffset[i].xy), inputOffset[i].zw) ).x,');
                    fs.push('         texture2D(tex, min(max(tuv + vec2(         0,  pixSize.y), inputOffset[i].xy), inputOffset[i].zw) ).x,');
                    fs.push('         texture2D(tex, min(max(tuv + vec2( pixSize.x,  pixSize.y), inputOffset[i].xy), inputOffset[i].zw) ).x)');
                } else {
                    fs.push('    vec3(texture2D(tex, tuv + vec2(-pixSize.x, -pixSize.y)).x,');
                    fs.push('         texture2D(tex, tuv + vec2(         0, -pixSize.y)).x,');
                    fs.push('         texture2D(tex, tuv + vec2( pixSize.x, -pixSize.y)).x),');
                    fs.push('    vec3(texture2D(tex, tuv + vec2(-pixSize.x,          0)).x,');
                    fs.push('         texture2D(tex, tuv + vec2(         0,          0)).x,');
                    fs.push('         texture2D(tex, tuv + vec2( pixSize.x,          0)).x),');
                    fs.push('    vec3(texture2D(tex, tuv + vec2(-pixSize.x,  pixSize.y)).x,');
                    fs.push('         texture2D(tex, tuv + vec2(         0,  pixSize.y)).x,');
                    fs.push('         texture2D(tex, tuv + vec2( pixSize.x,  pixSize.y)).x)');                    
                }
                fs.push(');');
                fs.push('sum += dot(weight[i][0].xyz, pix[0].xyz);');
                fs.push('sum += dot(weight[i][1].xyz, pix[1].xyz);');
                fs.push('sum += dot(weight[i][2].xyz, pix[2].xyz);');
    	   	    fs.push('}');
                fs.push('sum += bias;');
                fs.push('sum = max(sum, 0.0) + min(sum, 0.0) * 0.1;');
                fs.push('gl_FragColor = vec4(sum,sum,sum,1.0);');
                fs.push('}');
                var frag = fs.join('\n');
                //console.log(frag);
                convpr[si] = new vgl.ShaderProgram(g);
        	    convpr[si].create(convVS, frag);
                if (convpr[si].getProgram() === 0) {
                    dispMsg('<font color="red">Failed to compile shader.</font>');
                    return false;
                }
            }
            return true;
        }
    	
        // make VB
        vb.write(g.ARRAY_BUFFER, new Float32Array([
              -1,-1,0,
               1,-1,0,
              -1, 1,0,
               1, 1,0]), 4);
               
        // setup texture and rendertarget   
        var inputtex  = new vgl.Texture(g),
            b1 = new vgl.RenderTarget(g),
            b2 = new vgl.RenderTarget(g),
            inputBuf  = b1,
            outputBuf = b2;
            
        b1.create(4096, 2048, g.RGBA, g.FLOAT);
        b2.create(4096, 2048, g.RGBA, g.FLOAT);
        
        dispMsg('Loading Model file...');
        
        function drawInit() {  
            inputBuf.bind();
            inputtex.writeFromCanvas(inputimage);
            initpr.bind();
                g.viewport(0, 0, 256, 256); // inputBuf.width, inputBuf.height
                g.bindTexture(g.TEXTURE_2D, inputtex.getTexture());
                initpr.setInt('tex', 0);
                initpr.setAttrib("position", vb);
                vb.draw(g.TRIANGLE_STRIP);
            initpr.unbind();
            inputBuf.unbind();
        }
           
        function draw(cnt) {
            var n = model.length,
                i,
                outputPlane,
                inputPlane,
                mat3,
                ioffset = [2];
            var op, ip, mm, vx, vy, vw, vh;
            if (cnt < n) {
                i = cnt;
            
                outputPlane = model[i].nOutputPlane;
                inputPlane  = model[i].nInputPlane;
                outputBuf.bind();
                convpr[i].bind();
                convpr[i].setAttrib("position", vb);
                g.bindTexture(g.TEXTURE_2D, inputBuf.getColorTexture().getTexture());
                convpr[i].setInt('tex', 0);
                convpr[i].setVec2('pixSize', 1.0/4096, 1.0/2048);
                
                for (op = 0; op < outputPlane; op = op + 1) {
                    convpr[i].setInt('inputplane', inputPlane);
                    convpr[i].setFloat('bias',  model[i].bias[op]);
                    for (ip = 0; ip < inputPlane; ip = ip + 1) {
                        mat3 =  model[i].weight[op][ip];        
                        mm = Array(mat3[0][0], mat3[0][1], mat3[0][2],
                                   mat3[1][0], mat3[1][1], mat3[1][2],
                                   mat3[2][0], mat3[2][1], mat3[2][2]);
                                           
                        
                        convpr[i].setMat3('weight[' + ip + ']', mm);
                        ioffset[0] = (ip % 16) / 16.0;
                        ioffset[1] = Math.floor(ip / 16.0) / 8.0;
                        ioffset[2] = Math.max(0.0, ioffset[0] + 1.0 / 16.0 - 0.000001);
                        ioffset[3] = Math.max(0.0, ioffset[1] + 1.0 / 8.0 - 0.000001);
                        if (compileMode === 'unifrom') {
    	                   convpr[i].setVec4('inputOffset[' + ip + ']', ioffset[0], ioffset[1], ioffset[2], ioffset[3]);
                        }
                    }
                    
                    vx = (op * 256) % 4096;
                    vy = Math.floor((op * 256) / 4096) * 256;
                    vw = 256;
                    vh = 256;
                    g.viewport(vx, vy, vw, vh);
                       
                    vb.draw(g.TRIANGLE_STRIP);
                }
                convpr[i].unbind();
                outputBuf.unbind();
                
                // swap buffer
                var t = outputBuf;
                outputBuf = inputBuf;
                inputBuf = t;
                
                g.viewport(0,0, c.width, c.height);
                var cl = i / n;
                g.clearColor(cl, cl, cl, 1.0);
                g.clear(g.COLOR_BUFFER_BIT);
            } else {
                g.viewport(0,0, c.width, c.height);            
                rgbpr.bind();
                g.activeTexture(g.TEXTURE0 + 1);
                g.bindTexture(g.TEXTURE_2D, inputtex.getTexture());
                g.activeTexture(g.TEXTURE0 + 0);
                g.bindTexture(g.TEXTURE_2D, inputBuf.getColorTexture().getTexture());
                rgbpr.setInt('tex', 0);
                rgbpr.setInt('orgtex', 1);
                rgbpr.setAttrib("position", vb);
                vb.draw(g.TRIANGLE_STRIP);
                rgbpr.unbind();
            }
            return (cnt == n ? true : false);
        }
    
        //------------------
    
        var imgSelect = document.getElementById("imgselect"),
            simg = null;
        imgSelect.value = "";
        
        function getScaleValue() {
            if (document.getElementById("iscale10").checked) {
                return 1.0;
            } else if (document.getElementById("iscale16").checked) {
                return 1.6;                
            } else {
                return 2.0;                
            }            
        }
        function scaleImage() {
            var ctx = document.getElementById('ic').getContext('2d'),
                scale = getScaleValue();
            if (simg !== null) {
                ctx.drawImage(simg, 0,0, simg.width * scale, simg.height * scale);
            }
        }
        function readimage (imgdata) {
            var img = document.createElement( 'img' );
            img.onload = function() {
                simg = img;
                scaleImage();
            };
            img.src = imgdata;
        }
        imgSelect.addEventListener("change", function() {
               var file = this.files[0],
                   imageType = /^image\//;
                
                dispMsg('Ready.');
                if( file.type.match( imageType ) ) {
                    var reader = new FileReader();
                    reader.onload = (function() {
                        return function( e ){
                            readimage(e.target.result);
                        };
                    }());
                    reader.readAsDataURL( file );
                } else {
                    dispMsg('Unsupported file');
                }
        });
        document.getElementById('iscale10').addEventListener('click', function () {
            scaleImage(); 
        });
        document.getElementById('iscale16').addEventListener('click', function () {
            scaleImage(); 
        });
        document.getElementById('iscale20').addEventListener('click', function () {
            scaleImage(); 
        });
        
        
        //------------------
       
        function loadedModelJson(modeljson) {
            document.getElementById('execute').disabled = false;
            
            try {
                var jdata = JSON.parse(modeljson),
                    ret;
                model = jdata;
                ret = createPrograms(model, document.getElementById('edgeclamp').checked);
                
                if (ret) {
                    dispMsg('<b>Select image file.<b>');
                }                
            } catch (e) {
                dispMsg(e);
            }
        }
        
        function loadModel(modelpath) {
            document.getElementById('execute').disabled = true;
            
            var xhr= new XMLHttpRequest();
            xhr.onreadystatechange = function(){
                if (xhr.readyState === 4 && xhr.status === 200){
                    loadedModelJson(xhr.response);
                }
                if (xhr.readyState === 4 && xhr.status === 0){
                    loadedModelJson(xhr.response);
                }
            };
            xhr.open("GET",modelpath);
            xhr.send(null);
        }
        loadModel("noise1_model.json");
        
        document.getElementById('edgeclamp').addEventListener("change", function () {            
            var v = document.getElementById('edgeclamp').checked,
                ret = createPrograms(model, v);                
                if (ret) {
                    dispMsg('<b>Select image file.<b>');
                }
        });
        
        document.getElementById('noise1').addEventListener("click", function () {            
            loadModel("noise1_model.json");
        });
        document.getElementById('noise2').addEventListener("click", function () {
            loadModel("noise2_model.json");
        });
        
        
        //----------------
        var cnt = -1,
            starttime = 0;          
        function waifuStep() {
            var ret;
            if (cnt == -1) {
                return;
            }
            if (cnt == 0) {
                starttime = Date.now();
                drawInit();
            }
            ret = draw(cnt);
            if (ret) {
                dispMsg('Elapsed time:' + (Date.now() - starttime).toString() + '[ms]' );
                document.getElementById('execute').disabled = false;
                cnt = -1;
            } else {
                cnt = cnt + 1;
                setTimeout(waifuStep, 0);
            }
        }
        var exeButton = document.getElementById("execute");
        exeButton.addEventListener("click", function() {
            document.getElementById('execute').disabled = true;
            cnt = 0;
            setTimeout(waifuStep, 0);
        }); 
        
    };
}(window));