import axios from 'axios';
import {Spinner} from 'spin.js';
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
    dataApiUrl = appBlock.dataset.apiUrl,
    spinner = new Spinner().spin(),
    spinnerOverlay = document.getElementById('spinner-overlay');

let maps = [],
    objects = [],
    areas = [];

function startSpin() {
    spinnerOverlay.innerHTML = '';
    spinnerOverlay.appendChild(spinner.el);
    spinnerOverlay.classList.add('active');
}

function stopSpin() {
    spinnerOverlay.classList.remove('active');
}

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
                console.log('Objects: ', objects);
                resolve(res);
            })
            .catch(function (e) {
                reject(e);
            })
    })
}

function fetchAreas(token) {
    return new Promise(function(resolve, reject) {
        axios.get(dataApiUrl + '/objects/Areas', {
            headers: {
                "X-Appercode-Session-Token": token,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        })
            .then(function (res) {
                areas = res.data;
                console.log('Areas: ', areas);
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
        function parseElement(el, type) {
            const objectElement = map.svg.getElementById(el.svgId);

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
                        addMapElement(type, [d1, d2], object, map.map, mapIndex);
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

                        addMapElement(type, points, el, map.map, mapIndex);

                        break;
                }
            }
        }

        objects.forEach(object => {
            parseElement(object, 'object');
        });

        areas.forEach(area => {
            parseElement(area, 'area');
        })
    });
}

function addMapElement(type, bounds, data, map, mapIndex) {
    const polygon = L.polygon(bounds, {
        color: type === 'object' ? 'red' : 'orange',
        weight: 1
    });
    polygon.addTo(map);

    data.mapObject = polygon;
    data.mapObject.mapIndex = mapIndex;
    data.type = type;

    polygon.on('click', () => {
        mapElementClick(polygon, data);
    });
}

function mapElementClick(el, data) {
    const map = maps[el.mapIndex].map;
    const marker = L.marker(el.getCenter()).addTo(map);

    removeMapMarkers(el.mapIndex);

    map.flyToBounds(el.getBounds());

    const scheme = data.type === 'object' ? 'Partners' : 'HtmlPages';
    const actor = data.type === 'object' ? 'GeneralCatalogPageActor' : 'AreasPageActor';
    const params = {
        objectId: data.id,
        schemaId: scheme
    };
    let url = 'actor:'  + actor + '?params=' + encodeURIComponent(JSON.stringify(params));
    let link = `<a href="${url}">Подробнее</a>`;

    infoPanel.innerHTML = `${data.title} ${link}`;
    infoPanel.classList.add('active');

    maps[el.mapIndex].mapMarkers.push(marker);
}

function removeMapMarkers(mapIndex) {
    const mapMakers = maps[mapIndex].mapMarkers;

    for(let i = 0; i < mapMakers.length; i++){
        maps[mapIndex].map.removeLayer(mapMakers[i]);
    }
}

function messageFromNative(svgId) {
    let object = objects.find(obj => {
        return obj.svgId === svgId;
    });

    let area = areas.find(ar => {
        return ar.svgId === svgId;
    });

    if (object && object.mapObject) {
        switchMap(object.mapObject.mapIndex);

        object.mapObject.fire('click');
    } else {
        console.log(`Object ${svgId} not found!`);
    }

    if (area && area.mapObject) {
        switchMap(area.mapObject.mapIndex);

        area.mapObject.fire('click');
    } else {
        console.log(`Area ${svgId} not found!`);
    }
}

function init() {
    apiLogin()
        .then(res => {
            if (res.data && res.data.sessionId) {
                return Promise.all([
                    fetchObjects(res.data.sessionId),
                    fetchAreas(res.data.sessionId)
                ]);
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
            stopSpin();
        });
}

window.messageFromNative = messageFromNative;
window.maps = maps;

startSpin();
init();
