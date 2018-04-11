import axios from 'axios';
import L from 'leaflet';
import URLSearchParams from 'url-search-params';

// Leaflet icon fix for webpack
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});
// END: Leaflet icon fix for webpack

//Styles
import styles from "../css/style.css";

const appBlock = document.getElementById('app'),
    mapBlock = document.getElementById('maps'),
    mapBlockData = JSON.parse(appBlock.dataset.svgs),
    infoPanel = document.getElementById('info-panel'),
    mapSwitcherBlock = document.getElementById('map-switcher'),
    dataApiUrl = appBlock.dataset.apiUrl;

let maps = [],
    objects = [];

function apiLogin() {
    return axios.post(dataApiUrl + '/login/anonymous', {
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    });
}

function fetchObjects(token) {
    return new Promise(function(resolve, reject) {
        axios.get(dataApiUrl + '/objects/Exhibitors', {
            headers: {
                "X-Appercode-Session-Token": token,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        })
            .then(function (res) {
                objects = res.data;
                console.log(objects);
                console.log(objects.filter(object => {
                    if (object.svgId) {
                        console.log(object.svgId)
                    }
                    return object.svgId;
                }).length);
                resolve(res);
            })
            .catch(function (e) {
                reject(e);
            })
    })
}

function fetchSVGs() {
    return new Promise(function(resolve, reject) {
        let promises = [];

        mapBlockData.forEach((mapData, i) => {
            let promise = axios.get(mapData.url, {responseType: 'document'})
                .then(res => {
                    if (res.data && res.data.documentElement) {
                        const svgData = res.data.documentElement;
                        maps[i] = {
                            url: mapData.url,
                            title: mapData.title_en,
                            map: {},
                            mapMarkers: [],
                            svg: res.data.documentElement,
                            svgMapWidth: parseInt(svgData.attributes.width.value),
                            svgMapHeight: parseInt(svgData.attributes.height.value)
                        };
                    }
                })
                .catch(function (e) {
                    reject(e)
                });

            promises.push(promise);
        });

        Promise.all(promises).then(value => {
            resolve()
        }, error => {
            reject(new Error('Error in SVG file?'))
        });
    });
}

function initMaps() {
    maps.forEach((map, i) => {
        let newMapBlock = document.createElement('div');
        newMapBlock.setAttribute('id', 'map-' + i);
        newMapBlock.setAttribute('class', 'map map-' + i);
        mapBlock.appendChild(newMapBlock);

        map.map = L.map('map-' + i, {
            crs: L.CRS.Simple,
            minZoom: -4,
            attributionControl: false
        });

        const bounds = [[0,0], [map.svgMapHeight, map.svgMapWidth]];
        const image = L.imageOverlay(map.url, bounds);
        image.addTo(map.map);
        map.map.fitBounds(bounds);
        map.map.setMaxBounds(bounds);

        let mapSwitcherLink = document.createElement('a');
        mapSwitcherLink.setAttribute('href', '#');
        mapSwitcherLink.classList.add('map-switcher-item');
        mapSwitcherLink.innerHTML = map.title;
        mapSwitcherLink.addEventListener('click', e => {
            switchMap(i);
        });
        mapSwitcherBlock.appendChild(mapSwitcherLink);
    });

    // Activate first map
    document.getElementById('map-0').classList.add('active');
    mapSwitcherBlock.querySelector('.map-switcher-item').classList.add('active');

    // Add switcher
    if (maps.length > 1) {
        mapSwitcherBlock.classList.add('active');
    }
}

function switchMap(i) {
    mapBlock.querySelectorAll('.map').forEach(el => {
        el.classList.remove('active');
    });

    document.getElementById('map-' + i).classList.add('active');

    mapSwitcherBlock.querySelectorAll('.map-switcher-item').forEach(el => {
        el.classList.remove('active');
    });

    mapSwitcherBlock.querySelectorAll('.map-switcher-item')[i].classList.add('active');
}

function parseSVG() {
    maps.forEach((map, mapIndex) => {
        objects.forEach(object => {
            const objectElement = map.svg.querySelector('[id^="' + object.svgId + '"]');

            if (objectElement) {
                switch (objectElement.nodeName) {
                    case 'rect':
                        const d1 = [
                            map.svgMapHeight - parseInt(objectElement.attributes.y.value),
                            parseInt(objectElement.attributes.x.value)
                        ];
                        const d2 = [
                            d1[0] - parseInt(objectElement.attributes.height.value),
                            d1[1] + parseInt(objectElement.attributes.width.value)
                        ];
                        addMapRectangle([d1, d2], object, map.map, mapIndex);
                        break;
                    case 'polygon':
                        let points = objectElement.attributes.points.value.split(' ');

                        points = points.filter(String);

                        points.forEach(function (point, i) {
                            points[i] = point.split(',').reverse();

                            points[i].forEach(function(num, numI) {
                                points[i][numI] = parseInt(points[i][numI]);
                            });

                            points[i][0] = map.svgMapHeight -  points[i][0];
                        });

                        addMapPolygon(points, object, map.map, mapIndex);

                        break;
                }
            }
        });
    });
}

function addMapRectangle(bounds, data, map, mapIndex) {
    const rectangle = L.rectangle(bounds, {color: "orange", weight: 1});
    rectangle.addTo(map);
    rectangle.on('click', function () {
        mapObjectClick(rectangle, data, map, mapIndex);
    });

    data.mapObject = rectangle;
    data.mapObject.mapIndex = mapIndex;
}

function addMapPolygon(points, data, map, mapIndex) {
    const polygon = L.polygon(points, {color: "orange", weight: 1});
    polygon.addTo(map);
    polygon.on('click', function() {
        mapObjectClick(polygon, data, map, mapIndex);
    });

    data.mapObject = polygon;
    data.mapObject.mapIndex = mapIndex;
}

function mapObjectClick(obj, data, map, mapIndex) {
    removeMapMarkers(mapIndex);
    const marker = L.marker(obj.getCenter()).addTo(map);

    map.flyToBounds(obj.getBounds());

    infoPanel.innerHTML = data.title + ' — <a href="#' + data.id + '">Подробнее</a>';
    infoPanel.classList.add('active');

    maps[mapIndex].mapMarkers.push(marker);
}

function removeMapMarkers(mapIndex) {
    const mapMakers = maps[mapIndex].mapMarkers;

    for(let i = 0; i < mapMakers.length; i++){
        maps[mapIndex].map.removeLayer(mapMakers[i]);
    }
}

function messageFromNative(id) {
    id = parseInt(id);

    if (objects[id] && objects[id].mapObject) {
        switchMap(objects[id].mapObject.mapIndex);

        objects[id].mapObject.fire('click');
    } else {
        console.log('Object not found!')
    }
}

function init() {
    apiLogin()
        .then(res => {
            if (res.data && res.data.sessionId) {
                return fetchObjects(res.data.sessionId);
            }
        })
        .then(() => {
            return fetchSVGs();
        })
        .then(() => {
            initMaps();
        })
        .then(() => {
            parseSVG()
        })
        .then(() => {
            const urlParams = new URLSearchParams(window.location.search);

            if (urlParams.get('map')) {
                switchMap( parseInt( urlParams.get('map') ) );
            }

            if (urlParams.get('id')) {
                messageFromNative( urlParams.get('id') );
            }
        })
}

window.messageFromNative = messageFromNative;
window.maps = maps;

init();
