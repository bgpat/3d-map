'use strict';

const R = 6378137;
const latitude = 36.630871;
const longitude = 138.1873053;

let orientation = {
  screen: 0,
  device: {
    alpha: 0,
    beta: 90,
    gamma: 0,
  },
};

function latlon2vec(r, lat, lon) {
  let theta = THREE.Math.degToRad(lat);
  let phi = THREE.Math.degToRad(lon);
  let x = r * Math.cos(theta) * Math.sin(phi);
  let y = r * Math.sin(theta);
  let z = r * Math.cos(theta) * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

$.get('./data.json').then(data => {
  let scene = new THREE.Scene();

  let r = R + 400;
  let camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1e15);
  camera.position.set(...latlon2vec(r, latitude, longitude).toArray());
  let y = r * Math.sin(THREE.Math.degToRad(latitude));
  const north = new THREE.Vector3(0, R * R / y, 0);
  let focus = north.clone();
  camera.lookAt(focus);

  let air = new THREE.Group();
  scene.add(air);

  let sun = new THREE.PointLight(0xffcc00, 0.7);
  sun.position.set(...latlon2vec(1496e8, 0, 0).toArray());
  sun.lookAt(latlon2vec(1e15, 0, 0));
  air.add(sun);

  let moon = new THREE.PointLight(0xffff99, 0.1);
  moon.position.set(...latlon2vec(3844e5, 0, 180).toArray());
  moon.lookAt(latlon2vec(1e15, 0, 180));
  air.add(moon);

  let ambient = new THREE.AmbientLight(0x000033);
  scene.add(ambient);

  let renderer = new THREE.WebGLRenderer();

  renderer.setClearColor(0x003366, 1);
  $(renderer.domElement).css({
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  }).on('render', function() {
    air.rotateY(-Math.PI * 0.001);
    camera.lookAt(focus);
    renderer.render(scene, camera);
    requestAnimationFrame(() => $(this).trigger('render'));
  }).appendTo(document.body).trigger('render');

  $(renderer.domElement).on('mousemove', function(e) {
    let data = $(this).data();
    let x = e.offsetX - data.x;
    let y = e.offsetY - data.y;
    let azimuth = data.azimuth || 0;
    let elevation = data.elevation || 0;
    if (!isNaN(x) && e.originalEvent.buttons & 1) {
      let q = new THREE.Quaternion();
      let n = camera.position.clone().normalize();
      q.setFromAxisAngle(n, THREE.Math.degToRad(x) * 0.1);
      focus.applyQuaternion(q);
      let h = n.clone().cross(focus).normalize();
      q.setFromAxisAngle(h, THREE.Math.degToRad(-y) * 0.1);
      focus.applyQuaternion(q);
      camera.up = n;
    }
    $(this).data({
      x: e.offsetX,
      y: e.offsetY,
      azimuth,
      elevation,
    });
  }).on('wheel', function(e) {
    let height = $(this).data('height');
    height += e.originalEvent.deltaY;
    height = Math.min(3000, Math.max(400, height));
    camera.position.set(...latlon2vec(R + height, latitude, longitude).toArray());
    $(this).data('height', height);
  }).data('height', 400);

  $(window).on('resize', e => {
    let width = $(window).width();
    let height = $(window).height();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }).trigger('resize');

  let geometry = new THREE.Geometry();
  geometry.vertices = data.map(p => latlon2vec(R + p.altitude, p.latitude, p.longitude));
  geometry.faces = d3.voronoi().triangles(data.map((p, i) => [
    p.longitude,
    p.latitude,
    i,
  ])).map(t => new THREE.Face3(...t.map(p => p[2]).reverse()));
  let material = new THREE.MeshPhongMaterial({
    color: 0x1a6666,
    shininess: 1,
  });
  let mesh = new THREE.Mesh(geometry, material);
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();
  scene.add(mesh);

  let earthGeometry = new THREE.SphereGeometry(R, 100, 100);
  let earthMesh = new THREE.Mesh(earthGeometry, material);
  scene.add(earthMesh);
});
