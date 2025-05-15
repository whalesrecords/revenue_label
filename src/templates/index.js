export const templates = {
  default: {
    name: "Default Template",
    description: "Template par défaut pour l'analyse des revenus",
    columns: [
      "Date",
      "Artist",
      "Title",
      "Revenue",
      "Platform",
      "Country"
    ],
    aggregations: {
      "Revenue": "sum",
      "Platform": "group",
      "Country": "group"
    },
    charts: [
      {
        type: "bar",
        title: "Revenus par Artiste",
        x: "Artist",
        y: "Revenue"
      },
      {
        type: "pie",
        title: "Distribution par Platform",
        value: "Revenue",
        category: "Platform"
      },
      {
        type: "line",
        title: "Évolution des Revenus",
        x: "Date",
        y: "Revenue"
      }
    ]
  },
  detailed: {
    name: "Template Détaillé",
    description: "Analyse détaillée avec répartition géographique",
    columns: [
      "Date",
      "Artist",
      "Title",
      "Revenue",
      "Platform",
      "Country",
      "Genre",
      "Label"
    ],
    aggregations: {
      "Revenue": "sum",
      "Platform": "group",
      "Country": "group",
      "Genre": "group",
      "Label": "group"
    },
    charts: [
      {
        type: "bar",
        title: "Revenus par Label",
        x: "Label",
        y: "Revenue"
      },
      {
        type: "pie",
        title: "Distribution par Genre",
        value: "Revenue",
        category: "Genre"
      },
      {
        type: "line",
        title: "Évolution par Platform",
        x: "Date",
        y: "Revenue",
        groupBy: "Platform"
      }
    ]
  }
}; 