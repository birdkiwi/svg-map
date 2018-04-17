import i18next from 'i18next';

i18next
    .init({
        lng: 'en',
        fallbackLng: 'en',
        resources: {
            en: {
                ui: {
                    details: "Details"
                },
                errors: {
                    errorFetchingSVG: "Error while fetching SVG",
                    errorFetchingObjects: "Error while fetching objects",
                    errorFetchingAreas: "Error while fetching areas"
                }
            },
            ru: {
                ui: {
                    details: "Подробнее"
                },
                errors: {
                    errorFetchingSVG: "Ошибка загрузки SVG",
                    errorFetchingObjects: "Ошибка загрузки объектов на карте",
                    errorFetchingAreas: "Ошибка загрузки площадок"
                }

            }
        }
    });

export default i18next;
