//these are out here for debug purposes
var scene, camera, controls, renderer, raycaster, projector, mouseVector, renderlist, gap;
var geometry, material, mesh, startpos, depth, animationlist, materialmap;

function main()
{
    gap = 10;
    depth = 5;

    function init() {
	//scene and camera
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 1000;

	
	projector = new THREE.Projector();
	mouseVector = new THREE.Vector3();

	//lighting
	var light = new THREE.DirectionalLight( 0xffffff, 0.8 );
	light.position.set( 0.2, 0.3, 1 ).normalize();
	scene.add( light );

	//controls
        controls = new THREE.OrbitControls(camera);
	initControls(controls);

	//keep track of what's being rendered and animated
	renderlist = new RenderList();
	animationlist = [];

	//work out shapes and materials
	geometry = new THREE.BoxGeometry(1000, 1000, depth);
	
	var frontmaterial = new THREE.MeshPhongMaterial({ color: 0x33CC33, shininess:70, vertexColors:THREE.FaceColors} );
	var sidematerial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, shininess:70, vertexColors:THREE.FaceColors} );
	var backmaterial = new THREE.MeshPhongMaterial({ color: 0x145214, shininess:70, vertexColors:THREE.FaceColors} );
	geometry.materials = [frontmaterial, sidematerial, backmaterial];

	materialmap = [1,1,1,1,1,1,1,1,0,0,2,2];
	//set up colours on faces
	for (var i = 0; i < 12; i++)
	{
	    geometry.faces[i].materialIndex = materialmap[i];
	}
	
	material = new THREE.MeshFaceMaterial(geometry.materials);
	mesh = new THREE.Mesh( geometry, material );
	var firstsquare = new Square(mesh);
	renderlist.add(firstsquare);	

	renderer = new THREE.WebGLRenderer({antialias:true});
	renderer.setSize( window.innerWidth, window.innerHeight );	

	document.body.appendChild( renderer.domElement );

	document.addEventListener( 'mousedown', onMouseDown, false);
	document.addEventListener( 'mouseup', onMouseUp, false);
	window.addEventListener('resize', onWindowResize, false);
	
    }

    function animate() {

	requestAnimationFrame( animate );
	//controls.update(); <-- does this do anything?
	
	//animationlist is a list of functions that return true if complete
	//I call each in turn and remove those that return true
	var len = animationlist.length;
	while(len--)
	{
	    var done = animationlist[len](); //for readability
	    if (done)
	    {
		animationlist.splice(len,1);		
	    }
	}
	
	renderer.render( scene, camera );

    }

    function onMouseDown(e)
    {
	mouseVector.x = 2*(e.clientX / window.innerWidth) -1 ;
	mouseVector.y = 1 - 2 * ( e.clientY / window.innerHeight );

	var vector = new THREE.Vector3( mouseVector.x, mouseVector.y, 1 ).unproject( camera );

	raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
	var intersects = raycaster.intersectObjects(scene.children);

	if (intersects[0])
	{
	    //it's annoying to move the shape when you are simply trying to click
	    //this is less annoying
	    controls.noRotate = true;
	    
	    if (e.button === 0)
		intersects[0].object.gameshape.split(renderlist);
	    else if (e.button === 2)
		intersects[0].object.gameshape.flip();
	}
    }

    function onMouseUp(e)
    {
	controls.noRotate = false;	
    }

    function GameShape(mesh)
    {
	this.mesh = mesh;
	mesh.gameshape = this;
    }
    
    function Square(mesh, flipped)
    {
	GameShape.call(this, mesh);
	this.flipped = flipped || false; //love this notation
    };
    Square.prototype = Object.create(GameShape.prototype);
    Square.prototype.split = function(renderlist)
    {
	var rmObject = this.mesh;
	var rmGeomParams = rmObject.geometry.parameters;
	var bigheight = (rmGeomParams.height + gap)/4;
	var height = (rmGeomParams.height - gap)/2;

	if (height > 5) //put a lower bound on how small these tiles get
	{
	    renderlist.remove(rmObject.gameshape);
	     
	    var geom = new THREE.BoxGeometry(height,
					     height,
					     rmGeomParams.depth);

	    //add back material association to the geometry
	    for (var i = 0; i < 12; i++)
	    {
		geom.faces[i].materialIndex = materialmap[i];
	    }

	    //create new meshes
	    var mesh0 = new THREE.Mesh(geom, material);
	    var mesh1 = new THREE.Mesh(geom, material);
	    var mesh2 = new THREE.Mesh(geom, material);
	    var mesh3 = new THREE.Mesh(geom, material);

	    //place them in the correct position
	    mesh0.position.addVectors(rmObject.position,
				      new THREE.Vector3(bigheight, bigheight, 0));
	    mesh1.position.addVectors(rmObject.position,
				      new THREE.Vector3(bigheight, -bigheight, 0));
	    mesh2.position.addVectors(rmObject.position,
				      new THREE.Vector3(-bigheight, bigheight, 0));
	    mesh3.position.addVectors(rmObject.position,
				      new THREE.Vector3(-bigheight,-bigheight, 0));


	    //orient them accordingly
	    if (this.flipped)
	    {
		mesh0.rotation.x = Math.PI;
		mesh1.rotation.x = Math.PI;
		mesh2.rotation.x = Math.PI;
		mesh3.rotation.x = Math.PI;
	    }
	   	   
	    renderlist.add(new Square(mesh0, this.flipped),new Square(mesh1, this.flipped),new Square(mesh2, this.flipped),new Square(mesh3, this.flipped));	    
	}
    };
    Square.prototype.flip = function(){
	
	animationlist.push(
	    flipAnimationGenerator(this.mesh, 30));
    };

    function flipAnimationGenerator(mesh, pifractions)
    {
	var step = (1/pifractions)*Math.PI;
	var count = 0;

	//LEXICAL CLOSURES HAAA!!!! (Imagine DBZ voice acting)
	return function()
	{
	    if (count < pifractions)
	    {
		mesh.rotation.x += step ;
		count++;

		if (mesh.rotation.x >= Math.PI*2)
 		    mesh.rotation.x = mesh.rotation.x - Math.PI*2;
		return false;
	    }
	    else
	    {
		mesh.gameshape.flipped = !mesh.gameshape.flipped;
		return true;
	    }
	};
    }
    
    function RenderList()
    {
	this.list = [];	
    }    
    RenderList.prototype.add = function(/*gameshapes*/)
    {
	var outerthis = this;
	var args = Array.prototype.slice.call(arguments);
	args.forEach(function(gameshape) {
	    outerthis.list.push(gameshape);
	    scene.add(gameshape.mesh);});
    };
    RenderList.prototype.remove = function(/*gameshapes*/)
    {
	var outerthis = this;
	var args = Array.prototype.slice.call(arguments);
	args.forEach(function(gameshape){
	    outerthis.list.splice(outerthis.list.indexOf(gameshape), 1);
	    scene.remove(gameshape.mesh);});
    };

    function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
    }

    function initControls(controls){
	controls.damping = 0.2;
	controls.minPolarAngle = Math.PI/2;
	controls.maxPolarAngle = Math.PI/2;	
	controls.minAzimuthAngle = -Math.PI/2;
	controls.maxAzimuthAngle = Math.PI/2;
	controls.noPan = true;
    }
        
    init();
    animate();
}

