# CSV Revenue Analysis Tool

Une application web moderne pour analyser les fichiers CSV de revenus avec une interface élégante et des visualisations de données.

## Fonctionnalités

- Upload de fichiers CSV par drag & drop
- Analyse automatique des données
- Visualisations graphiques interactives
- Gestion des templates d'analyse
- Interface moderne avec thème sombre
- Animations fluides

## Technologies Utilisées

- React.js
- Material-UI
- Framer Motion
- Node.js (Backend)

## Installation

1. Cloner le repository :
```bash
git clone [URL_DU_REPO]
cd csv-merge
```

2. Installer les dépendances :
```bash
cd client
npm install
```

3. Lancer l'application en développement :
```bash
npm start
```

4. Pour la production :
```bash
npm run build
```

## Configuration

L'application nécessite un serveur backend sur le port 5001. Assurez-vous que le serveur backend est en cours d'exécution avant de lancer l'application.

## License

MIT

# CSV Merger Web App

A modern web application for merging CSV files with different strategies. Built with React and Node.js.

## Features

- 🎯 Drag and drop interface for file uploads
- 📊 Multiple merge strategies:
  - Union: Combines all rows from all files
  - Join: Matches rows based on the first column
  - Total: Sums numeric values for matching keys
- 🎨 Beautiful, responsive Material-UI interface
- ⚡ Fast server-side processing
- 📥 Automatic file download after merging

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd csv-merger-web
   ```

2. Install dependencies:
   ```bash
   npm run install-all
   ```

### Running the Application

1. Start both the server and client:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Drag and drop CSV files onto the upload area (or click to select files)
2. Select your desired merge strategy:
   - Union: Combines all rows from all files
   - Join: Matches rows based on the first column
   - Total: Sums numeric values for matching keys
3. Click "Merge Files"
4. The merged CSV file will automatically download

## Development

- Frontend: React with Material-UI (port 3000)
- Backend: Express.js (port 5000)
- File handling: multer for uploads, csv-parse/csv-stringify for processing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# CSV Merge

A GUI tool to merge and consolidate CSV files.

Download it [here](https://github.com/deviousasti/csv-merge/raw/master/csv-merge.exe).

For a tutorial on how to combine your Bill of Materials (BOM), [see here](https://asti.dynz.net/post/bom-merge/).

Basic Usage
-----------

![Main window](https://user-images.githubusercontent.com/2375486/65368444-a97ba500-dc5e-11e9-96a0-40143940efe2.png)

Add files by dragging and dropping them into the window.
You can also drag in whole folders and they will be recursively searched for csv files. This is useful when the actual files are structured like 'Project/Outputs/BOM.csv'.

You can delete files by selecting entries from the list and hitting the delete key. You can select all by dragging or using `Ctrl+A`. 

Drag and drop multiple times in case you missed something. Files won't be duplicated.

Merging
-------

![Files added](https://user-images.githubusercontent.com/2375486/65368762-e5186e00-dc62-11e9-8fab-311041e63074.png)

Once the files are added, just hit merge. 

Some files may have a different number of headers, or the columns may be in a different order. Select one of the entries to choose which file's column order to use as output.

**Note**

The merged output will have a column inserted named (Source) which will contain the name of the file that contained the row.


Consolidation
--------------

As with merge, select one of the files to choose a column order.

![Consolidation screen](https://user-images.githubusercontent.com/2375486/65369354-86a2be00-dc69-11e9-9bbf-6da6978e219f.png)

From the list choose one or more columns to *act as a key*.
The combination of key fields will be used to determine the number of rows.

Click on one of the `Combine` fields to choose the type of operation.

### Combine operations

#### `Union` 
Set union, which discards duplicates
`A, A, B, C, A, B, D` becomes `A, B, C, D`

#### `Join` 
Joins all fields with the specified separator - if none is specified, a semicolon `;` is used

#### `Total` 
Sums all the fields together. A numeric type is expected. 

--------------------------------------------------------------------------

Example
-------


| Sales_Rep_ID | Postcode | Sales_Rep_Name | Year | Value   | Commission |
| ------------ | -------- | -------------- | ---- | ------- | ---------- |
| 456          | 2027     | Jane           | 2017 | 11,444  | 5%         |
| 456          | 2110     | Jane           | 2017 | 30,569  | 5%         |
| 123          | 2137     | John           | 2017 | 83,085  | 5%         |
| 789          | 2164     | Jack           | 2017 | 82,490  | 5%         |
| 789          | 2067     | Jack           | 2018 | 23,819  | 5%         |


1. Choosing `Sales_Rep_ID` as the *key*, the consolidated result will have only `456, 123, 789`.

| Sales_Rep_ID | Postcode   | Sales_Rep_Name | Year       | Value          | Commission |
| ------------ | ---------- | -------------- | ---------- | -------------- | ---------- |
| 456          | 2027, 2110 | Jane           | 2017       | 11,444, 30,569 | 5%         |
| 123          | 2137       | John           | 2017       | 83,085         | 5%         |
| 789          | 2164, 2067 | Jack           | 2017, 2018 | 82,490, 23,819 | 5%         |

2. Choosing `Sales_Rep_ID` and `Year` as the key:

| Sales_Rep_ID | Postcode   | Sales_Rep_Name | Year | Value          | Commission |
| ------------ | ---------- | -------------- | ---- | -------------- | ---------- |
| 456          | 2027, 2110 | Jane           | 2017 | 11,444, 30,569 | 5%         |
| 123          | 2137       | John           | 2017 | 83,085         | 5%         |
| 789          | 2164       | Jack           | 2017 | 82,490         | 5%         |
| 789          | 2067       | Jack           | 2018 | 23,819         | 5%         |

3. Choosing `Year` as the key, and *Total* on `Value`:

| Sales_Rep_ID  | Postcode               | Sales_Rep_Name   | Year | Value  | Commission |
| ------------- | ---------------------- | ---------------- | ---- | ------ | ---------- |
| 456, 123, 789 | 2027, 2110, 2137, 2164 | Jane, John, Jack | 2017 | 207588 | 5%         |
| 789           | 2067                   | Jack             | 2018 | 23819  | 5%         |

4. Choosing `Year` as the key, *Total* on `Value`, and *Join* on `Sales_Rep_ID` and `Sales_Rep_Name`  [See screen](https://user-images.githubusercontent.com/2375486/65372156-e14c1200-dc89-11e9-85fd-2a08fa7d3807.png):


|Sales_Rep_ID       | Postcode               | Sales_Rep_Name         | Year | Value  | Commission |
|------------------ | ---------------------- | ---------------------- | ---- | ------ | ---------- |
|456; 456; 123; 789 | 2027, 2110, 2137, 2164 | Jane; Jane; John; Jack | 2017 | 207588 | 5%         |
|789                | 2067                   | Jack                   | 2018 | 23819  | 5%         |


