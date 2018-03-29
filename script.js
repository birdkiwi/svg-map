(function () {
    var appBlock = document.getElementById('app'),
        infoPanel = document.getElementById('info-panel'),
        svgMapUrl = appBlock.dataset.svgUrl,
        svgMapWidth = 0,
        svgMapHeight = 0,
        svgData,
        dataUrl = appBlock.dataset.url,
        mapBlock = document.getElementById('map'),
        map,
        objects = {},
        mapMarkers = [];

    function fetchObjects() {
        return new Promise(function(resolve, reject) {
            axios.get(dataUrl)
                .then(function (res) {
                    objects = res.data.partners;
                    resolve(res);
                })
                .catch(function (e) {
                    reject(e);
                })
        })
    }

    function fetchSVG() {
        return new Promise(function(resolve, reject) {
            axios.get(svgMapUrl, {responseType: 'document'})
                .then(function (res) {
                    if (res.data && res.data.documentElement) {
                        svgData = res.data.documentElement;
                        svgMapWidth = parseInt(svgData.attributes.width.value);
                        svgMapHeight = parseInt(svgData.attributes.height.value);

                        resolve(res);
                    } else {
                        reject(new Error('Error in SVG file?'))
                    }
                })
                .catch(function (e) {
                    reject(e)
                });
        });
    }

    function parseSVG() {
        for (var id in objects) {
            var objectElement = svgData.getElementById(id);
            if (objectElement) {
                switch (objectElement.nodeName) {
                    case 'rect':
                        var d1 = [
                            svgMapHeight - parseInt(objectElement.attributes.y.value),
                            parseInt(objectElement.attributes.x.value)
                        ];
                        var d2 = [
                            d1[0] - parseInt(objectElement.attributes.height.value),
                            d1[1] + parseInt(objectElement.attributes.width.value)
                        ];
                        addMapRectangle([d1, d2], objects[id]);
                        break;
                    case 'polygon':
                        var points = objectElement.attributes.points.value.split(' ');

                        points = points.filter(String);

                        points.forEach(function (point, i) {
                            points[i] = point.split(',').reverse();

                            points[i].forEach(function(num, numI) {
                                points[i][numI] = parseInt(points[i][numI]);
                            });

                            points[i][0] = svgMapHeight -  points[i][0];
                        });

                        addMapPolygon(points, objects[id]);

                        break;
                }
            }
        }
    }

    function addMapRectangle(bounds, data) {
        var rectangle = L.rectangle(bounds, {color: "orange", weight: 1});
        rectangle.addTo(map);
        rectangle.on('click', function () {
            mapObjectClick(rectangle, data);
        });

        data.mapObject = rectangle;
    }

    function addMapPolygon(points, data) {
        var polygon = L.polygon(points, {color: "orange", weight: 1});
        polygon.addTo(map);
        polygon.on('click', function() {
            mapObjectClick(polygon, data);
        });

        data.mapObject = polygon;
    }

    function mapObjectClick(obj, data) {
        removeMapMarkers();
        var marker = L.marker(obj.getCenter()).addTo(map);

        map.flyToBounds(obj.getBounds());

        infoPanel.innerHTML = 'partner_name: ' + data.partner_name + ' | partner_code: <a href="#' + data.partner_code + '">' + data.partner_code + '</a>';
        infoPanel.classList.add('active');

        mapMarkers.push(marker);
    }

    function removeMapMarkers() {
        for(var i = 0; i < mapMarkers.length; i++){
            this.map.removeLayer(mapMarkers[i]);
        }
    }

    function messageFromNative(id) {
        id = parseInt(id);

        if (objects[id] && objects[id].mapObject) {
            objects[id].mapObject.fire('click');
        } else {
            console.log('Object not found!')
        }
    }

    window.messageFromNative = messageFromNative;

    function init() {
        fetchObjects()
            .then(function () {
                return fetchSVG()
            })
            .then(function () {
                map = L.map('map', {
                    crs: L.CRS.Simple,
                    minZoom: -4,
                    attributionControl: false
                });

                var bounds = [[0,0], [svgMapHeight, svgMapWidth]];
                var image = L.imageOverlay(svgMapUrl, bounds).addTo(map);
                map.fitBounds(bounds);
                map.setMaxBounds(bounds);

                window.map = map;
            })
            .then(function () {
                parseSVG()
            })
            .then(function () {
                var urlParams = new URLSearchParams(window.location.search);

                if (urlParams.get('id')) {
                    messageFromNative(urlParams.get('id'));
                }
            })
    }

    init();
})();