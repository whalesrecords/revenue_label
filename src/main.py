import sys
import os
import json
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                           QHBoxLayout, QPushButton, QListWidget, QLabel, 
                           QComboBox, QFileDialog, QMessageBox, QLineEdit,
                           QDateEdit, QGroupBox, QGridLayout, QTableWidget,
                           QTableWidgetItem, QListWidgetItem, QInputDialog,
                           QSplitter, QTabWidget, QFrame, QMenu, QDialog,
                           QCheckBox)
from PyQt6.QtCore import Qt, QMimeData, QDate, QRect, QTimer
from PyQt6.QtGui import (QDragEnterEvent, QDropEvent, QPainter, QColor, QPen, 
                        QLinearGradient, QImage, QBrush)
import pandas as pd
from datetime import datetime
import csv
import traceback
from math import cos, sin, pi, atan2

print("Starting CSV Merge application...")

class ResultsWindow(QMainWindow):
    def __init__(self, results_data, summary_data, parent=None):
        print("Initializing ResultsWindow...")
        super().__init__(parent)
        self.setWindowTitle("Analysis Results")
        self.setMinimumSize(1000, 700)
        
        try:
            # Store data
            self.results_data = results_data
            
            # Create central widget
            central_widget = QWidget()
            self.setCentralWidget(central_widget)
            layout = QVBoxLayout(central_widget)
            
            # Create tab widget
            self.tabs = QTabWidget()
            layout.addWidget(self.tabs)
            
            # Overview Tab
            overview_tab = QWidget()
            overview_layout = QVBoxLayout(overview_tab)
            
            # Add filters section
            filters_group = QGroupBox("Filters")
            filters_layout = QGridLayout()
            
            # Period filter
            period_layout = QHBoxLayout()
            period_layout.addWidget(QLabel("Period:"))
            self.period_filter = QComboBox()
            periods = sorted(set(result['Period'] for result in results_data))
            self.period_filter.addItem("All Periods")
            self.period_filter.addItems(periods)
            self.period_filter.currentTextChanged.connect(self.apply_filters)
            period_layout.addWidget(self.period_filter)
            
            # Artist filter
            artist_layout = QHBoxLayout()
            artist_layout.addWidget(QLabel("Artist:"))
            self.artist_filter = QComboBox()
            artists = sorted(set(result.get('Artist', '') for result in results_data if 'Artist' in result))
            self.artist_filter.addItem("All Artists")
            self.artist_filter.addItems(artists)
            self.artist_filter.currentTextChanged.connect(self.apply_filters)
            artist_layout.addWidget(self.artist_filter)
            
            # Add filters to layout
            filters_layout.addLayout(period_layout, 0, 0)
            filters_layout.addLayout(artist_layout, 0, 1)
            filters_group.setLayout(filters_layout)
            overview_layout.addWidget(filters_group)
            
            # Add search/filter
            filter_layout = QHBoxLayout()
            filter_layout.addWidget(QLabel("Search:"))
            self.filter_input = QLineEdit()
            self.filter_input.setPlaceholderText("Type to search in results...")
            self.filter_input.textChanged.connect(self.filter_results)
            filter_layout.addWidget(self.filter_input)
            overview_layout.addLayout(filter_layout)
            
            # Create table
            self.table = QTableWidget()
            
            # Set up table columns based on available data
            headers = ['Period', 'Track']
            if any('Artist' in result for result in results_data):
                headers.insert(1, 'Artist')
            if any('Source' in result for result in results_data):
                headers.insert(1, 'Source')
            if any('UPC' in result for result in results_data):
                headers.insert(len(headers)-1, 'UPC')
            headers.extend(['Total Revenue', 'Artist Revenue'])
            
            self.table.setColumnCount(len(headers))
            self.table.setHorizontalHeaderLabels(headers)
            self.table.horizontalHeader().setStretchLastSection(True)
            self.table.setSortingEnabled(True)
            
            # Add data to table
            self.populate_table(results_data)
            overview_layout.addWidget(self.table)
            
            # Add export options
            export_group = QGroupBox("Export Options")
            export_layout = QHBoxLayout()
            
            # Export all button
            export_all_button = QPushButton("Export All Results")
            export_all_button.clicked.connect(self.export_results)
            export_layout.addWidget(export_all_button)
            
            # Export by artist button
            export_by_artist_button = QPushButton("Export by Artist")
            export_by_artist_button.clicked.connect(self.export_by_artist)
            export_layout.addWidget(export_by_artist_button)
            
            export_group.setLayout(export_layout)
            overview_layout.addWidget(export_group)
            
            # Add summary text if available
            if summary_data:
                self.summary_text = QLabel("\n".join(str(s) for s in summary_data))
                self.summary_text.setWordWrap(True)
                overview_layout.addWidget(self.summary_text)
            
            overview_tab.setLayout(overview_layout)
            self.tabs.addTab(overview_tab, "Overview")
            
            # Charts Tab
            charts_tab = QWidget()
            charts_layout = QVBoxLayout(charts_tab)
            
            # Chart controls
            controls_layout = QHBoxLayout()
            
            # Chart type selector
            chart_type_layout = QHBoxLayout()
            chart_type_layout.addWidget(QLabel("Chart Type:"))
            self.chart_type = QComboBox()
            self.chart_type.addItems(['Bar', 'Line', 'Pie'])
            chart_type_layout.addWidget(self.chart_type)
            controls_layout.addLayout(chart_type_layout)
            
            # Data grouping selector
            group_layout = QHBoxLayout()
            group_layout.addWidget(QLabel("Group By:"))
            self.group_by = QComboBox()
            group_options = ['By Period', 'By Track']
            if any('Artist' in result for result in results_data):
                group_options.insert(1, 'By Artist')
            self.group_by.addItems(group_options)
            group_layout.addWidget(self.group_by)
            controls_layout.addLayout(group_layout)
            
            # Value type selector
            value_layout = QHBoxLayout()
            value_layout.addWidget(QLabel("Show:"))
            self.value_type = QComboBox()
            self.value_type.addItems(['Total Revenue', 'Artist Revenue'])
            value_layout.addWidget(self.value_type)
            controls_layout.addLayout(value_layout)
            
            charts_layout.addLayout(controls_layout)
            
            # Create chart widget
            self.chart_widget = ChartWidget()
            charts_layout.addWidget(self.chart_widget)
            
            # Add update button
            update_button = QPushButton("Update Chart")
            update_button.clicked.connect(self.create_chart)
            charts_layout.addWidget(update_button)
            
            charts_tab.setLayout(charts_layout)
            self.tabs.addTab(charts_tab, "Charts")
            
            print("ResultsWindow initialization complete")
            
        except Exception as e:
            print(f"Error in ResultsWindow initialization: {str(e)}")
            traceback.print_exc()
            QMessageBox.critical(self, "Error", f"Failed to initialize results window: {str(e)}")

    def populate_table(self, data):
        """Populate the table with the given data"""
        try:
            self.table.setRowCount(len(data))
            headers = [self.table.horizontalHeaderItem(i).text() for i in range(self.table.columnCount())]
            
            for i, row in enumerate(data):
                for j, header in enumerate(headers):
                    if header == 'Period':
                        value = row.get('Period', '')
                    elif header == 'Artist':
                        value = row.get('Artist', '')
                    elif header == 'Source':
                        value = row.get('Source', '')
                    elif header == 'UPC':
                        value = row.get('UPC', '')
                    elif header == 'Track':
                        value = row.get('Track', '')
                    elif header == 'Total Revenue':
                        value = row.get('Total Revenue', '')
                    elif header == 'Artist Revenue':
                        value = row.get('Artist Revenue', '')
                    else:
                        value = ''
                    
                    item = QTableWidgetItem(str(value))
                    self.table.setItem(i, j, item)
        except Exception as e:
            print(f"Error populating table: {str(e)}")
            traceback.print_exc()

    def apply_filters(self):
        """Apply period and artist filters to the data"""
        try:
            filtered_data = self.results_data.copy()
            
            # Apply period filter
            selected_period = self.period_filter.currentText()
            if selected_period != "All Periods":
                filtered_data = [row for row in filtered_data if row['Period'] == selected_period]
            
            # Apply artist filter
            selected_artist = self.artist_filter.currentText()
            if selected_artist != "All Artists":
                filtered_data = [row for row in filtered_data if row.get('Artist', '') == selected_artist]
            
            # Update table with filtered data
            self.populate_table(filtered_data)
            
            # Apply text filter if any
            if self.filter_input.text():
                self.filter_results(self.filter_input.text())
                
        except Exception as e:
            print(f"Error applying filters: {str(e)}")
            traceback.print_exc()

    def export_by_artist(self):
        """Export results grouped by artist with quarterly totals"""
        try:
            # Get all artists
            artists = set(result.get('Artist', '') for result in self.results_data if 'Artist' in result)
            
            if not artists:
                QMessageBox.warning(self, "Warning", "No artist data available to export.")
                return
            
            # Get export directory
            export_dir = QFileDialog.getExistingDirectory(
                self,
                "Select Export Directory",
                "",
                QFileDialog.Option.ShowDirsOnly
            )
            
            if not export_dir:
                return
            
            # Export for each artist
            for artist in sorted(artists):
                if not artist:  # Skip empty artist names
                    continue
                    
                # Filter data for this artist
                artist_data = [
                    result for result in self.results_data
                    if result.get('Artist', '') == artist
                ]
                
                if not artist_data:
                    continue
                
                # Get all sources for this artist
                sources = sorted(set(result.get('Source', '') for result in artist_data if result.get('Source')))
                sources_str = '_'.join(sources) if sources else 'No_Source'
                
                # Convert periods to quarters if needed and get unique quarters
                quarters = set()
                for result in artist_data:
                    period = result['Period']
                    # If period is in YYYY-MM format, convert to quarter
                    if len(period) == 7 and period[4] == '-':
                        year = period[:4]
                        month = int(period[5:])
                        quarter = f"{year}-Q{(month-1)//3 + 1}"
                    # If period is already in YYYY-Qn format, keep it
                    elif len(period) == 7 and period[4:6] == '-Q':
                        quarter = period
                    else:
                        quarter = period
                    quarters.add(quarter)
                
                # Create filename
                safe_artist_name = "".join(c for c in artist if c.isalnum() or c in (' ', '-', '_')).strip()
                timestamp = datetime.now().strftime('%Y%m%d_%H%M')
                quarters_str = '_'.join(sorted(quarters)) if len(quarters) <= 2 else f"{min(quarters)}_to_{max(quarters)}"
                filename = f"Whales Records - {safe_artist_name} - Statement - {quarters_str} - {timestamp} - {sources_str}.csv"
                filepath = os.path.join(export_dir, filename)
                
                # Prepare data for export with quarterly grouping
                export_data = []
                quarterly_totals = {}
                
                # First, add all detailed rows
                for result in sorted(artist_data, key=lambda x: (x['Period'], x['Track'])):
                    # Determine quarter
                    period = result['Period']
                    if len(period) == 7 and period[4] == '-':
                        year = period[:4]
                        month = int(period[5:])
                        quarter = f"{year}-Q{(month-1)//3 + 1}"
                    else:
                        quarter = period
                    
                    # Get revenue values without currency
                    total_rev = float(result['Total Revenue'].split()[0])
                    artist_rev = float(result['Artist Revenue'].split()[0])
                    
                    # Update quarterly totals
                    if quarter not in quarterly_totals:
                        quarterly_totals[quarter] = {'Total Revenue': 0.0, 'Artist Revenue': 0.0}
                    quarterly_totals[quarter]['Total Revenue'] += total_rev
                    quarterly_totals[quarter]['Artist Revenue'] += artist_rev
                    
                    # Add row to export data
                    row = {
                        'Quarter': quarter,
                        'Period': result['Period'],
                        'Artist': artist,
                        'Source': result.get('Source', ''),
                        'UPC': result.get('UPC', ''),
                        'Track': result['Track'],
                        'Total Revenue': f"{total_rev:.2f}",
                        'Artist Revenue': f"{artist_rev:.2f}"
                    }
                    export_data.append(row)
                
                # Add empty row before totals
                if export_data:
                    export_data.append({
                        'Quarter': '',
                        'Period': '',
                        'Artist': '',
                        'Source': '',
                        'UPC': '',
                        'Track': '',
                        'Total Revenue': '',
                        'Artist Revenue': ''
                    })
                
                # Add quarterly totals
                for quarter in sorted(quarterly_totals.keys()):
                    totals = quarterly_totals[quarter]
                    export_data.append({
                        'Quarter': quarter,
                        'Period': 'TOTAL',
                        'Artist': artist,
                        'Source': ', '.join(sources),
                        'UPC': '',
                        'Track': 'Quarterly Total',
                        'Total Revenue': f"{totals['Total Revenue']:.2f}",
                        'Artist Revenue': f"{totals['Artist Revenue']:.2f}"
                    })
                
                # Add grand total
                grand_total_rev = sum(totals['Total Revenue'] for totals in quarterly_totals.values())
                grand_total_artist = sum(totals['Artist Revenue'] for totals in quarterly_totals.values())
                
                # Add empty row before grand total
                export_data.append({
                    'Quarter': '',
                    'Period': '',
                    'Artist': '',
                    'Source': '',
                    'UPC': '',
                    'Track': '',
                    'Total Revenue': '',
                    'Artist Revenue': ''
                })
                
                # Add grand total row
                export_data.append({
                    'Quarter': 'TOTAL',
                    'Period': 'ALL QUARTERS',
                    'Artist': artist,
                    'Source': ', '.join(sources),
                    'UPC': '',
                    'Track': 'Grand Total',
                    'Total Revenue': f"{grand_total_rev:.2f}",
                    'Artist Revenue': f"{grand_total_artist:.2f}"
                })
                
                # Save to CSV
                df = pd.DataFrame(export_data)
                df.to_csv(filepath, index=False)
            
            QMessageBox.information(
                self,
                "Export Complete",
                f"Artist revenue data exported to:\n{export_dir}"
            )
            
        except Exception as e:
            print(f"Error exporting by artist: {str(e)}")
            traceback.print_exc()
            QMessageBox.critical(self, "Error", f"Failed to export artist data: {str(e)}")

    def filter_results(self, text):
        """Filter results based on search text"""
        try:
            text = text.lower()
            for row in range(self.table.rowCount()):
                show_row = False
                for col in range(self.table.columnCount()):
                    item = self.table.item(row, col)
                    if item and text in item.text().lower():
                        show_row = True
                        break
                self.table.setRowHidden(row, not show_row)
        except Exception as e:
            print(f"Error filtering results: {str(e)}")
            traceback.print_exc()

    def create_chart(self):
        """Create and display the chart using ChartWidget"""
        try:
            print("\nCreating chart...")
            
            # Get selections
            chart_type = self.chart_type.currentText()
            group_by = self.group_by.currentText()
            value_type = self.value_type.currentText()
            
            print(f"Chart type: {chart_type}")
            print(f"Group by: {group_by}")
            print(f"Value type: {value_type}")
            
            # Process data based on grouping
            data = {}
            for row in self.results_data:
                # Get the key based on grouping
                if group_by == 'By Period':
                    key = row['Period']
                elif group_by == 'By Track':
                    key = row['Track']
                elif group_by == 'By Artist' and 'Artist' in row:
                    key = row['Artist']
                else:
                    continue
                
                # Get the value
                try:
                    value_str = row[value_type].split()[0]  # Remove currency symbol
                    value = float(value_str)
                    data[key] = data.get(key, 0) + value
                except (ValueError, IndexError):
                    continue
            
            # Sort data by value for better visualization
            sorted_data = sorted(data.items(), key=lambda x: x[1], reverse=True)
            
            # Take top 10 items for better readability
            labels = [item[0] for item in sorted_data[:10]]
            values = [item[1] for item in sorted_data[:10]]
            
            # Update the chart widget
            self.chart_widget.set_data(labels, values, chart_type)
            
            # Show export button if not already shown
            if not hasattr(self, 'export_chart_button'):
                self.export_chart_button = QPushButton("Export Chart")
                self.export_chart_button.clicked.connect(self.export_chart)
                # Add button to charts tab layout
                charts_tab = self.tabs.widget(1)  # Charts tab is index 1
                charts_layout = charts_tab.layout()
                charts_layout.addWidget(self.export_chart_button)
            
            print("Chart created successfully")
            
        except Exception as e:
            print("\nError creating chart:")
            print(str(e))
            traceback.print_exc()
            QMessageBox.warning(self, "Chart Error", 
                "Could not create chart. See console for details.")
                
    def export_chart(self):
        """Export the current chart as an image"""
        try:
            # Get file name from user
            file_name, _ = QFileDialog.getSaveFileName(
                self,
                "Export Chart",
                "",
                "PNG Images (*.png);;JPEG Images (*.jpg *.jpeg);;All Files (*.*)"
            )
            
            if file_name:
                # Create image with higher resolution for better quality
                scale_factor = 2
                image = QImage(
                    self.chart_widget.size() * scale_factor,
                    QImage.Format.Format_ARGB32
                )
                image.fill(Qt.GlobalColor.white)
                
                # Create painter for the image
                painter = QPainter(image)
                painter.setRenderHint(QPainter.RenderHint.Antialiasing)
                painter.scale(scale_factor, scale_factor)
                
                # Render the widget to the image
                self.chart_widget.render(painter)
                painter.end()
                
                # Save the image
                if image.save(file_name):
                    QMessageBox.information(
                        self,
                        "Export Successful",
                        f"Chart exported successfully to {file_name}"
                    )
                else:
                    QMessageBox.warning(
                        self,
                        "Export Failed",
                        "Failed to save the chart image"
                    )
        except Exception as e:
            print(f"Error exporting chart: {str(e)}")
            traceback.print_exc()
            QMessageBox.critical(self, "Export Error", str(e))

    def export_results(self):
        """Export the results to CSV"""
        try:
            # Get current template name from parent window
            parent_window = self.parent()
            current_template = "No Template"
            if hasattr(parent_window, 'templates'):
                for name, template in parent_window.templates.items():
                    if (template['track_column'] == parent_window.track_column.currentText() and
                        template['revenue_column'] == parent_window.revenue_column.currentText() and
                        template['date_column'] == parent_window.date_column.currentText()):
                        current_template = name
                        break
            
            # Create filename with date, time and template
            timestamp = datetime.now().strftime('%Y%m%d_%H%M')
            default_filename = f"revenue_analysis_{timestamp}_{current_template}.csv"
            
            file_name, _ = QFileDialog.getSaveFileName(
                self,
                "Export Results",
                default_filename,
                "CSV Files (*.csv)"
            )
            
            if file_name:
                # Determine if we have artist column
                has_artist_column = self.table.columnCount() == 5
                
                # Set headers based on columns
                headers = ['Period', 'Track']
                if has_artist_column:
                    headers.append('Artist')
                headers.extend(['Total Revenue', 'Artist Revenue'])
                
                # Collect visible rows
                visible_results = []
                for row in range(self.table.rowCount()):
                    if not self.table.isRowHidden(row):
                        row_data = []
                        for col in range(self.table.columnCount()):
                            item = self.table.item(row, col)
                            row_data.append(item.text() if item else '')
                        visible_results.append(row_data)
                
                # Save to CSV
                df = pd.DataFrame(visible_results, columns=headers)
                df.to_csv(file_name, index=False)
                
                QMessageBox.information(self, "Export Complete", 
                    f"Results exported to {file_name}")
        except Exception as e:
            print(f"Error exporting results: {str(e)}")
            traceback.print_exc()
            QMessageBox.critical(self, "Export Error", str(e))

    def closeEvent(self, event):
        print("Closing ResultsWindow...")
        event.accept()

class ChartWidget(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(400, 300)
        self.setFrameStyle(QFrame.Shape.StyledPanel | QFrame.Shadow.Sunken)
        
        # Data and display properties
        self.data = []
        self.max_value = 0
        self.chart_type = 'Bar'
        self.visible_data_indices = set(range(10))  # Track visible data points
        
        # Animation properties
        self.animation_progress = 0.0
        self.animation_timer = QTimer(self)
        self.animation_timer.timeout.connect(self.update_animation)
        self.old_data = []
        self.new_data = []
        self.is_animating = False
        
        # Zoom and pan variables
        self.zoom_level = 1.0
        self.offset_x = 0
        self.offset_y = 0
        self.last_pos = None
        self.is_panning = False
        
        # Mouse tracking for tooltips
        self.setMouseTracking(True)
        
        # Tooltip data
        self.tooltip_text = ""
        self.tooltip_pos = None
        
        # Theme
        self.themes = ChartTheme.default_themes()
        self.current_theme = self.themes['Light']
        
        # Context menu
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self.show_context_menu)
        
    def show_context_menu(self, pos):
        menu = QMenu(self)
        
        # Theme submenu
        theme_menu = menu.addMenu("Theme")
        for theme_name in self.themes:
            action = theme_menu.addAction(theme_name)
            action.setCheckable(True)
            action.setChecked(self.current_theme.name == theme_name)
            action.triggered.connect(lambda checked, tn=theme_name: self.set_theme(tn))
        
        # Visibility submenu
        if self.data:
            visibility_menu = menu.addMenu("Show/Hide Data")
            for i, (label, _) in enumerate(self.data):
                action = visibility_menu.addAction(label)
                action.setCheckable(True)
                action.setChecked(i in self.visible_data_indices)
                action.triggered.connect(lambda checked, idx=i: self.toggle_data_visibility(idx))
        
        # Reset view action
        menu.addSeparator()
        reset_action = menu.addAction("Reset View")
        reset_action.triggered.connect(self.reset_view)
        
        menu.exec(self.mapToGlobal(pos))
        
    def set_theme(self, theme_name):
        if theme_name in self.themes:
            self.current_theme = self.themes[theme_name]
            self.update()
            
    def toggle_data_visibility(self, index):
        if index in self.visible_data_indices:
            self.visible_data_indices.remove(index)
        else:
            self.visible_data_indices.add(index)
        self.update()
        
    def reset_view(self):
        self.zoom_level = 1.0
        self.offset_x = 0
        self.offset_y = 0
        self.update()
        
    def set_data(self, labels, values, chart_type='Bar'):
        # Store old data for animation
        self.old_data = self.data.copy()
        self.new_data = list(zip(labels, values))
        self.max_value = max(values) if values else 0
        
        # Reset animation
        self.animation_progress = 0.0
        self.is_animating = True
        self.animation_timer.start(16)  # ~60 FPS
        
        self.chart_type = chart_type
        self.zoom_level = 1.0
        self.offset_x = 0
        self.offset_y = 0
        
        # Reset visible indices for new data
        self.visible_data_indices = set(range(len(self.new_data)))
        
    def update_animation(self):
        if self.is_animating:
            self.animation_progress += 0.05  # Adjust speed
            if self.animation_progress >= 1.0:
                self.animation_progress = 1.0
                self.is_animating = False
                self.animation_timer.stop()
                self.data = self.new_data
            self.update()
            
    def get_interpolated_data(self):
        if not self.is_animating:
            return [(label, value) for i, (label, value) in enumerate(self.data) 
                    if i in self.visible_data_indices]
            
        # Create interpolated data
        interpolated_data = []
        max_len = max(len(self.old_data), len(self.new_data))
        
        for i in range(max_len):
            if i not in self.visible_data_indices:
                continue
                
            if i < len(self.old_data) and i < len(self.new_data):
                # Interpolate between old and new values
                old_label, old_value = self.old_data[i]
                new_label, new_value = self.new_data[i]
                current_value = old_value + (new_value - old_value) * self.animation_progress
                interpolated_data.append((new_label, current_value))
            elif i < len(self.new_data):
                # Fade in new data
                label, value = self.new_data[i]
                interpolated_data.append((label, value * self.animation_progress))
            else:
                # Fade out old data
                label, value = self.old_data[i]
                interpolated_data.append((label, value * (1 - self.animation_progress)))
                
        return interpolated_data
        
    def paintEvent(self, event):
        if not self.data and not self.is_animating:
            return
            
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # Get widget dimensions
        width = self.width()
        height = self.height()
        
        # Calculate margins
        margin = 40
        bottom_margin = 60
        
        # Calculate available space
        chart_width = (width - 2 * margin) * self.zoom_level
        chart_height = (height - margin - bottom_margin) * self.zoom_level
        
        # Draw chart background
        painter.fillRect(self.rect(), self.current_theme.background_color)
        
        # Draw grid lines
        self.draw_grid(painter, width, height, margin, bottom_margin, chart_height)
        
        # Get current data (either interpolated during animation or filtered by visibility)
        current_data = self.get_interpolated_data()
        
        if self.chart_type == 'Bar':
            self.draw_bar_chart(painter, chart_width, chart_height, margin, bottom_margin, current_data)
        elif self.chart_type == 'Line':
            self.draw_line_chart(painter, chart_width, chart_height, margin, bottom_margin, current_data)
        else:  # Pie
            self.draw_pie_chart(painter, width, height, current_data)
            
        # Draw tooltip if needed
        if self.tooltip_text and self.tooltip_pos:
            self.draw_tooltip(painter)
        
    def draw_grid(self, painter, width, height, margin, bottom_margin, chart_height):
        painter.save()
        grid_pen = QPen(QColor(200, 200, 200))
        grid_pen.setStyle(Qt.PenStyle.DashLine)
        painter.setPen(grid_pen)
        
        # Draw horizontal grid lines
        num_lines = 5
        for i in range(num_lines + 1):
            y = height - bottom_margin - (i * chart_height / num_lines)
            painter.drawLine(margin, int(y), width - margin, int(y))
            
            # Draw value labels
            value = (i * self.max_value / num_lines)
            painter.drawText(5, int(y), margin - 10, 20,
                           Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter,
                           f"{value:,.0f}")
        
        painter.restore()
        
    def draw_tooltip(self, painter):
        painter.save()
        
        # Calculate tooltip dimensions
        font_metrics = painter.fontMetrics()
        lines = self.tooltip_text.split('\n')
        line_height = font_metrics.height()
        max_width = max(font_metrics.horizontalAdvance(line) for line in lines)
        
        # Calculate tooltip position
        padding = 5
        rect_width = max_width + 2 * padding
        rect_height = len(lines) * line_height + 2 * padding
        
        x = self.tooltip_pos.x() + 10
        y = self.tooltip_pos.y() - rect_height - 10
        
        # Ensure tooltip stays within widget bounds
        if x + rect_width > self.width():
            x = self.width() - rect_width - 5
        if y < 5:
            y = self.tooltip_pos.y() + 20
            
        # Draw tooltip background
        painter.setBrush(QColor(255, 255, 255, 230))
        painter.setPen(QColor(100, 100, 100))
        painter.drawRoundedRect(x, y, rect_width, rect_height, 5, 5)
        
        # Draw tooltip text
        painter.setPen(QColor(0, 0, 0))
        for i, line in enumerate(lines):
            painter.drawText(x + padding,
                           y + padding + i * line_height,
                           line)
        
        painter.restore()
        
    def draw_bar_chart(self, painter, chart_width, chart_height, margin, bottom_margin, data):
        if not data:
            return
            
        # Calculate bar width
        num_bars = len(data)
        bar_width = chart_width / (num_bars * 2)  # Leave space between bars
        
        # Draw bars
        for i, (label, value) in enumerate(data):
            # Calculate bar height
            bar_height = (value / self.max_value) * chart_height if self.max_value > 0 else 0
            
            # Calculate bar position with zoom and pan
            x = margin + self.offset_x + i * bar_width * 2
            y = self.height() - bottom_margin - bar_height
            
            # Draw bar with gradient
            gradient = QLinearGradient(x, y, x, y + bar_height)
            color = self.current_theme.colors[i % len(self.current_theme.colors)]
            gradient.setColorAt(0, color.lighter(120))
            gradient.setColorAt(1, color)
            
            painter.setBrush(gradient)
            painter.setPen(color.darker(110))
            painter.drawRect(int(x), int(y), int(bar_width), int(bar_height))
            
            # Draw label
            painter.save()
            painter.translate(x + bar_width/2, self.height() - bottom_margin + 5)
            painter.rotate(-45)
            painter.drawText(0, 0, str(label))
            painter.restore()
            
            # Draw value
            value_text = f"{value:,.0f}"
            painter.drawText(int(x), int(y - 15), int(bar_width), 20,
                           Qt.AlignmentFlag.AlignCenter, value_text)

    def draw_line_chart(self, painter, chart_width, chart_height, margin, bottom_margin, data):
        if not data:
            return
            
        # Calculate point spacing
        num_points = len(data)
        point_spacing = chart_width / (num_points - 1) if num_points > 1 else chart_width
        
        # Create points
        points = []
        for i, (label, value) in enumerate(data):
            x = margin + self.offset_x + i * point_spacing
            y = self.height() - bottom_margin - (value / self.max_value * chart_height if self.max_value > 0 else 0)
            points.append((x, y))
            
            # Draw point with gradient
            color = self.current_theme.colors[i % len(self.current_theme.colors)]
            painter.setBrush(color)
            painter.setPen(QPen(color.darker(110), 2))
            painter.drawEllipse(int(x - 4), int(y - 4), 8, 8)
            
            # Draw label
            painter.save()
            painter.translate(x, self.height() - bottom_margin + 5)
            painter.rotate(-45)
            painter.drawText(0, 0, str(label))
            painter.restore()
            
            # Draw value
            value_text = f"{value:,.0f}"
            painter.drawText(int(x - 30), int(y - 15), 60, 20,
                           Qt.AlignmentFlag.AlignCenter, value_text)
        
        # Draw lines between points with gradient
        if len(points) > 1:
            for i in range(len(points) - 1):
                x1, y1 = points[i]
                x2, y2 = points[i + 1]
                
                # Create gradient for line
                gradient = QLinearGradient(x1, y1, x2, y2)
                color1 = self.current_theme.colors[i % len(self.current_theme.colors)]
                color2 = self.current_theme.colors[(i + 1) % len(self.current_theme.colors)]
                gradient.setColorAt(0, color1)
                gradient.setColorAt(1, color2)
                
                # Draw line with gradient
                pen = QPen()
                pen.setBrush(gradient)
                pen.setWidth(2)
                painter.setPen(pen)
                painter.drawLine(int(x1), int(y1), int(x2), int(y2))
    
    def draw_pie_chart(self, painter, width, height, data):
        if not data:
            return
            
        # Calculate total
        total = sum(value for _, value in data)
        if total == 0:
            return
            
        # Calculate center and radius
        center_x = width / 2
        center_y = height / 2
        radius = min(width, height) / 2.5  # Leave space for labels
        
        # Starting angle
        start_angle = 0
        
        # Draw slices
        for i, (label, value) in enumerate(data):
            # Calculate angle for this slice
            angle = (value / total) * 360
            
            # Get base color
            base_color = self.current_theme.colors[i % len(self.current_theme.colors)]
            
            # Create gradient for 3D effect
            gradient = QLinearGradient(
                center_x - radius, center_y - radius,
                center_x + radius, center_y + radius
            )
            gradient.setColorAt(0, base_color.lighter(120))
            gradient.setColorAt(1, base_color.darker(110))
            
            # Set brush and pen
            painter.setBrush(gradient)
            painter.setPen(QPen(base_color.darker(120), 1))
            
            # Draw slice
            painter.drawPie(
                int(center_x - radius),
                int(center_y - radius),
                int(radius * 2),
                int(radius * 2),
                int(start_angle * 16),
                int(angle * 16)
            )
            
            # Calculate label position
            label_angle = start_angle + angle / 2
            label_radius = radius * 1.2
            label_x = center_x + cos(label_angle * pi / 180) * label_radius
            label_y = center_y - sin(label_angle * pi / 180) * label_radius
            
            # Draw label with percentage
            painter.setPen(Qt.GlobalColor.black)
            label_text = f"{label}\n{value:,.0f} ({(value/total)*100:.1f}%)"
            
            # Calculate text bounding rect
            font_metrics = painter.fontMetrics()
            text_width = font_metrics.horizontalAdvance(label_text)
            text_height = font_metrics.height() * 2  # Two lines
            
            # Adjust label position to keep it in view
            text_x = int(label_x - text_width/2)
            text_y = int(label_y - text_height/2)
            
            # Ensure label stays within widget bounds
            text_x = max(10, min(text_x, width - text_width - 10))
            text_y = max(10, min(text_y, height - text_height - 10))
            
            # Draw text background
            painter.setBrush(QColor(255, 255, 255, 200))
            painter.setPen(Qt.GlobalColor.gray)
            painter.drawRoundedRect(text_x - 5, text_y - 5,
                                  text_width + 10, text_height + 10,
                                  5, 5)
            
            # Draw text
            painter.setPen(Qt.GlobalColor.black)
            painter.drawText(text_x, text_y, text_width, text_height,
                           Qt.AlignmentFlag.AlignCenter, label_text)
            
            start_angle += angle

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.is_panning = True
            self.last_pos = event.pos()
            self.setCursor(Qt.CursorShape.ClosedHandCursor)
            
    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.is_panning = False
            self.setCursor(Qt.CursorShape.ArrowCursor)
            
    def mouseMoveEvent(self, event):
        if self.is_panning and self.last_pos:
            delta = event.pos() - self.last_pos
            self.offset_x += delta.x()
            self.offset_y += delta.y()
            self.last_pos = event.pos()
            self.update()
        else:
            # Update tooltip
            self.update_tooltip(event.pos())
            
    def wheelEvent(self, event):
        # Zoom in/out with mouse wheel
        zoom_factor = 1.1 if event.angleDelta().y() > 0 else 0.9
        self.zoom_level *= zoom_factor
        # Limit zoom level
        self.zoom_level = max(0.5, min(3.0, self.zoom_level))
        self.update()
        
    def update_tooltip(self, pos):
        if not self.data:
            return
            
        # Calculate chart area
        width = self.width()
        height = self.height()
        margin = 40
        bottom_margin = 60
        
        chart_width = width - 2 * margin
        chart_height = height - margin - bottom_margin
        
        # Get current data
        current_data = self.get_interpolated_data()
        
        if self.chart_type == 'Bar':
            # Calculate bar positions and check if mouse is over a bar
            num_bars = len(current_data)
            bar_width = (chart_width * self.zoom_level) / (num_bars * 2)
            
            for i, (label, value) in enumerate(current_data):
                x = margin + self.offset_x + i * bar_width * 2
                y = height - bottom_margin - (value / self.max_value * chart_height * self.zoom_level)
                
                if x <= pos.x() <= x + bar_width and y <= pos.y() <= height - bottom_margin:
                    self.tooltip_text = f"{label}\nValue: {value:,.2f}"
                    self.tooltip_pos = pos
                    self.update()
                    return
        elif self.chart_type == 'Line':
            # Check if mouse is near any point
            num_points = len(current_data)
            point_spacing = chart_width / (num_points - 1) if num_points > 1 else chart_width
            
            for i, (label, value) in enumerate(current_data):
                x = margin + self.offset_x + i * point_spacing
                y = height - bottom_margin - (value / self.max_value * chart_height * self.zoom_level)
                
                # Check if mouse is within 5 pixels of the point
                if abs(x - pos.x()) <= 5 and abs(y - pos.y()) <= 5:
                    self.tooltip_text = f"{label}\nValue: {value:,.2f}"
                    self.tooltip_pos = pos
                    self.update()
                    return
        elif self.chart_type == 'Pie':
            # Calculate center and radius
            center_x = width / 2
            center_y = height / 2
            radius = min(width, height) / 2.5
            
            # Calculate angle from center to mouse
            dx = pos.x() - center_x
            dy = pos.y() - center_y
            distance = (dx * dx + dy * dy) ** 0.5
            
            if distance <= radius:
                angle = (180 / pi) * (pi/2 - (0 if dx == 0 else atan2(dy, dx)))
                if angle < 0:
                    angle += 360
                    
                # Find which slice contains this angle
                total = sum(value for _, value in current_data)
                current_angle = 0
                
                for label, value in current_data:
                    slice_angle = (value / total) * 360
                    if current_angle <= angle < current_angle + slice_angle:
                        self.tooltip_text = f"{label}\nValue: {value:,.2f}\n({(value/total)*100:.1f}%)"
                        self.tooltip_pos = pos
                        self.update()
                        return
                    current_angle += slice_angle
                    
        self.tooltip_text = ""
        self.tooltip_pos = None
        self.update()

class CSVMergeApp(QMainWindow):
    def __init__(self):
        print("Initializing main window...")
        super().__init__()
        self.setWindowTitle("Music Revenue Analysis")
        self.setMinimumSize(1200, 900)
        self.csv_files = []
        self.currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF']
        self.available_columns = []
        self.tracks_list = []
        
        # Setup data directories
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.data_dir = os.path.join(self.base_dir, 'data')
        self.exports_dir = os.path.join(self.data_dir, 'exports')
        self.history_dir = os.path.join(self.data_dir, 'history')
        self.templates_dir = os.path.join(self.data_dir, 'templates')
        
        # Ensure directories exist
        self.ensure_directories()
        
        # Set file paths
        self.templates_file = os.path.join(self.templates_dir, 'column_templates.json')
        self.results_file = os.path.join(self.history_dir, 'analysis_history.json')
        
        self.load_templates()
        self.load_analysis_history()
        self.setup_ui()
        print("Main window initialized")

    def ensure_directories(self):
        """Ensure all required directories exist"""
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.exports_dir, exist_ok=True)
        os.makedirs(self.history_dir, exist_ok=True)
        os.makedirs(self.templates_dir, exist_ok=True)

    def get_export_path(self, default_name):
        """Get path for export files with proper directory"""
        return os.path.join(self.exports_dir, default_name)

    def setup_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)

        # Create horizontal layout for main content and history
        main_layout = QHBoxLayout()
        
        # Left panel for inputs and results
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)

        # File selection section
        file_group = QGroupBox("CSV Files")
        file_layout = QVBoxLayout()
        
        header_layout = QHBoxLayout()
        header_label = QLabel("Import your revenue CSV files:")
        
        # File management buttons
        button_layout = QHBoxLayout()
        add_button = QPushButton("Add Files")
        add_button.clicked.connect(self.add_files)
        clean_import_button = QPushButton("Clean Import")
        clean_import_button.clicked.connect(self.clean_import)
        
        button_layout.addWidget(add_button)
        button_layout.addWidget(clean_import_button)
        
        header_layout.addWidget(header_label)
        header_layout.addStretch()
        header_layout.addLayout(button_layout)
        file_layout.addLayout(header_layout)

        self.file_list = QListWidget()
        self.file_list.setAcceptDrops(True)
        self.file_list.dragEnterEvent = self.dragEnterEvent
        self.file_list.dropEvent = self.dropEvent
        file_layout.addWidget(self.file_list)
        file_group.setLayout(file_layout)
        left_layout.addWidget(file_group)

        # Column mapping section with template buttons
        mapping_group = QGroupBox("Column Mapping")
        mapping_layout = QGridLayout()

        # Template management buttons
        template_layout = QHBoxLayout()
        save_template_button = QPushButton("Save Template")
        save_template_button.clicked.connect(self.save_template)
        load_template_button = QPushButton("Load Template")
        load_template_button.clicked.connect(self.load_template)
        edit_template_button = QPushButton("Edit Template")
        edit_template_button.clicked.connect(self.edit_template)
        template_layout.addWidget(save_template_button)
        template_layout.addWidget(load_template_button)
        template_layout.addWidget(edit_template_button)
        mapping_layout.addLayout(template_layout, 0, 0, 1, 4)

        # Track column mapping
        mapping_layout.addWidget(QLabel("Track Column:"), 1, 0)
        self.track_column = QComboBox()
        self.track_column.currentTextChanged.connect(self.update_filters)
        mapping_layout.addWidget(self.track_column, 1, 1)

        # Artist column mapping
        mapping_layout.addWidget(QLabel("Artist Column:"), 1, 2)
        self.artist_column = QComboBox()
        self.artist_column.addItem("")  # Empty option
        self.artist_column.currentTextChanged.connect(self.update_filters)
        mapping_layout.addWidget(self.artist_column, 1, 3)

        # UPC column mapping (optional)
        mapping_layout.addWidget(QLabel("UPC Column (Optional):"), 2, 0)
        self.upc_column = QComboBox()
        self.upc_column.addItem("")  # Add empty option
        mapping_layout.addWidget(self.upc_column, 2, 1)

        # Revenue column mapping
        mapping_layout.addWidget(QLabel("Revenue Column:"), 2, 2)
        self.revenue_column = QComboBox()
        mapping_layout.addWidget(self.revenue_column, 2, 3)

        # Date column mapping
        mapping_layout.addWidget(QLabel("Date Column:"), 3, 0)
        self.date_column = QComboBox()
        mapping_layout.addWidget(self.date_column, 3, 1)

        mapping_group.setLayout(mapping_layout)
        left_layout.addWidget(mapping_group)

        # Filters section
        filter_group = QGroupBox("Filters")
        filter_layout = QGridLayout()

        # Date range selection
        date_range_layout = QHBoxLayout()
        date_range_layout.addWidget(QLabel("From:"))
        self.date_from = QDateEdit()
        self.date_from.setCalendarPopup(True)
        self.date_from.setDate(QDate.currentDate().addMonths(-1))
        date_range_layout.addWidget(self.date_from)
        
        date_range_layout.addWidget(QLabel("To:"))
        self.date_to = QDateEdit()
        self.date_to.setCalendarPopup(True)
        self.date_to.setDate(QDate.currentDate())
        date_range_layout.addWidget(self.date_to)
        
        # Add date range to filter layout
        date_widget = QWidget()
        date_widget.setLayout(date_range_layout)
        filter_layout.addWidget(date_widget, 0, 0, 1, 4)  # Span 4 columns

        # Track and Artist filters side by side
        filters_layout = QHBoxLayout()
        
        # Track filter
        track_section = QVBoxLayout()
        track_label = QLabel("Select Tracks:")
        track_label.setStyleSheet("font-weight: bold;")
        track_section.addWidget(track_label)
        self.track_filter = QListWidget()
        self.track_filter.setSelectionMode(QListWidget.SelectionMode.MultiSelection)
        self.track_filter.setMinimumHeight(150)
        track_section.addWidget(self.track_filter)
        
        # Artist filter
        artist_section = QVBoxLayout()
        artist_label = QLabel("Select Artists:")
        artist_label.setStyleSheet("font-weight: bold;")
        artist_section.addWidget(artist_label)
        self.artist_filter = QListWidget()
        self.artist_filter.setSelectionMode(QListWidget.SelectionMode.MultiSelection)
        self.artist_filter.setMinimumHeight(150)
        artist_section.addWidget(self.artist_filter)
        
        filters_layout.addLayout(track_section)
        filters_layout.addLayout(artist_section)
        
        # Add filters to main layout
        filters_widget = QWidget()
        filters_widget.setLayout(filters_layout)
        filter_layout.addWidget(filters_widget, 1, 0, 1, 4)  # Span 4 columns

        filter_group.setLayout(filter_layout)
        left_layout.addWidget(filter_group)

        # Revenue settings
        revenue_group = QGroupBox("Revenue Settings")
        revenue_layout = QGridLayout()

        # Currency selection
        revenue_layout.addWidget(QLabel("Target Currency:"), 0, 0)
        self.currency_combo = QComboBox()
        self.currency_combo.addItems(self.currencies)
        revenue_layout.addWidget(self.currency_combo, 0, 1)

        # Advances
        revenue_layout.addWidget(QLabel("Advances to Recoup:"), 0, 2)
        self.advances = QLineEdit()
        self.advances.setPlaceholderText("e.g., 1000")
        self.advances.setText("0")  # Default value
        revenue_layout.addWidget(self.advances, 0, 3)

        # Period selection
        revenue_layout.addWidget(QLabel("Group by:"), 1, 0)
        self.period_group = QComboBox()
        self.period_group.addItems(['Month', 'Quarter', 'Year'])
        revenue_layout.addWidget(self.period_group, 1, 1)

        revenue_group.setLayout(revenue_layout)
        left_layout.addWidget(revenue_group)

        # Action buttons
        button_layout = QHBoxLayout()
        
        clear_button = QPushButton("Clear All")
        clear_button.clicked.connect(self.clear_all)
        button_layout.addWidget(clear_button)
        
        refresh_button = QPushButton("Refresh")
        refresh_button.clicked.connect(self.refresh_interface)
        button_layout.addWidget(refresh_button)
        
        merge_button = QPushButton("Merge Selected Tracks")
        merge_button.clicked.connect(self.merge_selected_tracks)
        button_layout.addWidget(merge_button)
        
        button_layout.addStretch()
        
        analyze_button = QPushButton("Analyze Revenue")
        analyze_button.clicked.connect(self.analyze_revenue)
        button_layout.addWidget(analyze_button)
        
        left_layout.addLayout(button_layout)

        layout.addWidget(left_panel)
        
        main_layout.addWidget(left_panel, stretch=2)

        # Right panel for analysis history
        history_panel = QWidget()
        history_layout = QVBoxLayout(history_panel)
        
        history_group = QGroupBox("Analysis History")
        history_inner_layout = QVBoxLayout()
        
        # History list
        self.history_list = QListWidget()
        self.history_list.itemDoubleClicked.connect(self.load_analysis)
        history_inner_layout.addWidget(self.history_list)
        
        # History buttons
        history_buttons = QHBoxLayout()
        
        load_analysis_button = QPushButton("Load Selected")
        load_analysis_button.clicked.connect(lambda: self.load_analysis(self.history_list.currentItem()))
        history_buttons.addWidget(load_analysis_button)
        
        delete_analysis_button = QPushButton("Delete Selected")
        delete_analysis_button.clicked.connect(self.delete_analysis)
        history_buttons.addWidget(delete_analysis_button)
        
        history_inner_layout.addLayout(history_buttons)
        history_group.setLayout(history_inner_layout)
        history_layout.addWidget(history_group)
        
        main_layout.addWidget(history_panel, stretch=1)
        
        layout.addLayout(main_layout)

    def update_tracks_list(self):
        """Update the tracks list when track column is selected"""
        try:
            if self.csv_files and self.track_column.currentText():
                # Read all unique tracks from the files
                all_tracks = set()
                for file in self.csv_files:
                    try:
                        df = self.read_csv_file(file)
                        if df is not None:
                            track_col = self.track_column.currentText()
                            if track_col in df.columns:
                                # Convert all values to string and clean them
                                tracks = df[track_col].fillna('').astype(str).str.strip()
                                # Only add non-empty tracks
                                all_tracks.update(track for track in tracks.unique() if track)
                    except Exception as e:
                        print(f"Error reading tracks from {os.path.basename(file)}: {str(e)}")
                        continue

                # Update tracks filter list
                self.track_filter.clear()
                self.track_filter.addItem("All Tracks")
                
                # Sort tracks after converting to string
                sorted_tracks = sorted(all_tracks, key=str.lower)  # Case-insensitive sort
                for track in sorted_tracks:
                    if track:  # Skip empty tracks
                        item = QListWidgetItem(track)
                        self.track_filter.addItem(item)

        except Exception as e:
            QMessageBox.warning(self, "Warning", f"Error updating tracks list: {str(e)}")

    def get_selected_tracks(self):
        """Get list of selected tracks"""
        return [item.text() for item in self.track_filter.selectedItems()]

    def get_period_label(self, date):
        """Get period label based on grouping selection"""
        if pd.isna(date):
            return "Unknown"
            
        try:
            if self.period_group.currentText() == 'Month':
                return date.strftime('%Y-%m')
            elif self.period_group.currentText() == 'Quarter':
                quarter = (date.month - 1) // 3 + 1
                return f"{date.year}-Q{quarter}"
            else:  # Year
                return str(date.year)
        except Exception:
            return "Unknown"

    def detect_delimiter(self, file_path):
        """Detect the delimiter used in the CSV file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                # Read first line to detect delimiter
                first_line = f.readline()
                if first_line.count(';') > first_line.count(','):
                    return ';'
            return ','
        except Exception:
            return ','  # Default to comma if detection fails

    def clean_revenue_value(self, value):
        """Convert revenue string to float, handling different number formats"""
        if pd.isna(value) or value == '':
            return 0.0
        
        try:
            # If it's already a number, return it
            if isinstance(value, (int, float)):
                return float(value)
            
            # Remove any currency symbols and spaces
            value_str = str(value).strip().replace('€', '').replace('$', '').strip()
            
            # Try direct conversion first
            try:
                return float(value_str)
            except ValueError:
                # If failed, try replacing comma with dot
                value_str = value_str.replace(',', '.')
                return float(value_str)
        except Exception:
            return 0.0

    def read_csv_file(self, file_path):
        """Read CSV file with proper delimiter and handle quoted fields"""
        try:
            # Detect delimiter
            delimiter = self.detect_delimiter(file_path)
            
            # Try reading with detected delimiter and more robust settings
            df = pd.read_csv(
                file_path,
                delimiter=delimiter,
                low_memory=False,
                quoting=csv.QUOTE_MINIMAL,  # Use csv.QUOTE_MINIMAL instead
                escapechar='\\',
                on_bad_lines='warn'
            )
            
            # If we got only one column, try the other delimiter
            if len(df.columns) == 1:
                other_delimiter = ';' if delimiter == ',' else ','
                df = pd.read_csv(
                    file_path,
                    delimiter=other_delimiter,
                    low_memory=False,
                    quoting=csv.QUOTE_MINIMAL,
                    escapechar='\\',
                    on_bad_lines='warn'
                )
            
            # Clean the dataframe
            df = df.fillna('')  # Replace NaN with empty string
            
            # Remove any completely empty columns
            df = df.dropna(axis=1, how='all')
            
            # Remove any completely empty rows
            df = df.dropna(how='all')
            
            return df
        except Exception as e:
            QMessageBox.warning(self, "Warning", 
                f"Error reading file {os.path.basename(file_path)}: {str(e)}\n"
                "Please check if the file is properly formatted.")
            return None

    def update_column_lists(self):
        """Update column selection dropdowns based on CSV files"""
        try:
            # Read the first CSV to get columns
            if self.csv_files:
                df = self.read_csv_file(self.csv_files[0])
                if df is not None:
                    self.available_columns = df.columns.tolist()

                    # Clear existing items
                    self.track_column.clear()
                    self.artist_column.clear()
                    self.upc_column.clear()
                    self.revenue_column.clear()
                    self.date_column.clear()

                    # Add empty option for optional columns
                    self.artist_column.addItem('')
                    self.upc_column.addItem('')

                    # Add columns to dropdowns
                    self.track_column.addItems(self.available_columns)
                    self.artist_column.addItems(self.available_columns)
                    self.upc_column.addItems(self.available_columns)
                    self.revenue_column.addItems(self.available_columns)
                    self.date_column.addItems(self.available_columns)

                    # Common column names mapping
                    track_names = ['track', 'title', 'song title', 'song', 'track title', 'tc song id']
                    artist_names = ['artist', 'artist name', 'performer']
                    revenue_names = ['revenue', 'amount', 'earnings', 'total earned', 'earned']
                    date_names = ['date', 'period', 'sale date', 'transaction date', 'posted date']
                    upc_names = ['upc', 'barcode', 'isrc', 'optional isrc']

                    # Try to automatically select appropriate columns based on common names
                    for col in self.available_columns:
                        col_lower = col.lower()
                        
                        # Track column
                        if any(name in col_lower for name in track_names):
                            self.track_column.setCurrentText(col)
                            
                        # Artist column - don't select if it matches revenue names
                        if any(name in col_lower for name in artist_names) and not any(name in col_lower for name in revenue_names):
                            self.artist_column.setCurrentText(col)
                            
                        # UPC column
                        if any(name in col_lower for name in upc_names):
                            self.upc_column.setCurrentText(col)
                            
                        # Revenue column
                        if any(name in col_lower for name in revenue_names):
                            self.revenue_column.setCurrentText(col)
                            
                        # Date column
                        if any(name in col_lower for name in date_names):
                            self.date_column.setCurrentText(col)

                    # Print detected columns for debugging
                    print("Detected columns:")
                    print(f"Track: {self.track_column.currentText()}")
                    print(f"Artist: {self.artist_column.currentText()}")
                    print(f"UPC: {self.upc_column.currentText()}")
                    print(f"Revenue: {self.revenue_column.currentText()}")
                    print(f"Date: {self.date_column.currentText()}")

        except Exception as e:
            QMessageBox.warning(self, "Warning", f"Error reading columns: {str(e)}")

    def dragEnterEvent(self, event: QDragEnterEvent):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()

    def dropEvent(self, event: QDropEvent):
        files = [url.toLocalFile() for url in event.mimeData().urls()]
        self.add_files_to_list(files)

    def add_files(self):
        files, _ = QFileDialog.getOpenFileNames(
            self,
            "Select Revenue CSV Files",
            "",
            "CSV Files (*.csv)"
        )
        self.add_files_to_list(files)

    def add_files_to_list(self, files):
        newly_added_files = []
        for file in files:
            if file.lower().endswith('.csv'):
                if file not in self.csv_files:
                    self.csv_files.append(file)
                    self.file_list.addItem(os.path.basename(file))
                    newly_added_files.append(file)
        
        # Update column selections when files are added
        if newly_added_files:
            self.try_auto_detect_template(newly_added_files)

    def try_auto_detect_template(self, new_files):
        """Try to automatically detect and apply a template for new files"""
        try:
            # Read the first CSV to get columns
            df = self.read_csv_file(new_files[0])
            if df is None:
                return
                
            available_columns = df.columns.tolist()
            
            # Calculate match scores for each template
            best_match = None
            best_score = 0
            
            for template_name, template in self.templates.items():
                score = self.calculate_template_match_score(template, available_columns)
                if score > best_score:
                    best_score = score
                    best_match = template_name
            
            # If we found a good match (more than 70% match)
            if best_score >= 0.7:
                reply = QMessageBox.question(
                    self,
                    "Template Detected",
                    f"Found matching template: '{best_match}' ({best_score*100:.0f}% match)\nDo you want to apply it?",
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                
                if reply == QMessageBox.StandardButton.Yes:
                    self.apply_template(self.templates[best_match])
            else:
                # No good match found, suggest creating a template
                reply = QMessageBox.question(
                    self,
                    "Create New Template",
                    "No matching template found. Would you like to create a new template?",
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                
                if reply == QMessageBox.StandardButton.Yes:
                    self.suggest_template_mapping(available_columns)
        except Exception as e:
            print(f"Error in template detection: {str(e)}")
            traceback.print_exc()

    def calculate_template_match_score(self, template, available_columns):
        """Calculate how well a template matches the available columns"""
        score = 0
        total_fields = 0
        
        # Convert all to lowercase for comparison
        available_columns_lower = [col.lower() for col in available_columns]
        
        # Check each template field
        for field, value in template.items():
            if not value:  # Skip empty fields
                continue
                
            total_fields += 1
            # Check if the exact column exists
            if value.lower() in available_columns_lower:
                score += 1
                continue
                
            # Check for similar column names
            field_type = field.split('_')[0]  # e.g., 'track' from 'track_column'
            similar_columns = [
                col for col in available_columns_lower
                if field_type in col or self.get_column_type_keywords(field_type, col)
            ]
            if similar_columns:
                score += 0.8  # Partial match
                
        return score / total_fields if total_fields > 0 else 0

    def get_column_type_keywords(self, field_type, column_name):
        """Check if column name contains keywords related to the field type"""
        keywords = {
            'track': ['title', 'song', 'tc song id'],
            'artist': ['performer', 'artist name', 'band'],
            'revenue': ['amount', 'earnings', 'earned', 'income'],
            'date': ['period', 'sale date', 'transaction date', 'posted'],
            'upc': ['barcode', 'isrc', 'identifier']
        }
        
        return any(keyword in column_name.lower() for keyword in keywords.get(field_type, []))

    def suggest_template_mapping(self, available_columns):
        """Suggest column mappings and create a new template"""
        try:
            # Create suggested mappings
            suggested_mappings = {
                'track_column': '',
                'artist_column': '',
                'revenue_column': '',
                'date_column': '',
                'upc_column': ''
            }
            
            # Convert columns to lowercase for matching
            columns_lower = [col.lower() for col in available_columns]
            
            # Try to find matches for each field
            for field in suggested_mappings:
                field_type = field.split('_')[0]
                
                # Look for exact matches first
                exact_match = next(
                    (col for col, lower_col in zip(available_columns, columns_lower)
                     if field_type in lower_col),
                    None
                )
                
                if exact_match:
                    suggested_mappings[field] = exact_match
                    continue
                
                # Look for similar matches
                for col, lower_col in zip(available_columns, columns_lower):
                    if self.get_column_type_keywords(field_type, lower_col):
                        suggested_mappings[field] = col
                        break
            
            # Create dialog for template creation
            dialog = QDialog(self)
            dialog.setWindowTitle("Create New Template")
            layout = QVBoxLayout(dialog)
            
            # Template name input
            name_layout = QHBoxLayout()
            name_layout.addWidget(QLabel("Template Name:"))
            template_name = QLineEdit()
            name_layout.addWidget(template_name)
            layout.addLayout(name_layout)
            
            # Column mappings
            mappings_group = QGroupBox("Column Mappings")
            mappings_layout = QGridLayout()
            
            combo_boxes = {}
            for i, (field, suggested) in enumerate(suggested_mappings.items()):
                # Create label
                label = QLabel(field.replace('_column', '').title() + ":")
                mappings_layout.addWidget(label, i, 0)
                
                # Create combo box
                combo = QComboBox()
                combo.addItem("")  # Empty option
                combo.addItems(available_columns)
                if suggested:
                    combo.setCurrentText(suggested)
                combo_boxes[field] = combo
                mappings_layout.addWidget(combo, i, 1)
            
            mappings_group.setLayout(mappings_layout)
            layout.addWidget(mappings_group)
            
            # Buttons
            buttons = QHBoxLayout()
            save_button = QPushButton("Save Template")
            cancel_button = QPushButton("Cancel")
            buttons.addWidget(save_button)
            buttons.addWidget(cancel_button)
            layout.addLayout(buttons)
            
            # Connect buttons
            save_button.clicked.connect(dialog.accept)
            cancel_button.clicked.connect(dialog.reject)
            
            if dialog.exec() == QDialog.DialogCode.Accepted:
                # Get the template name
                name = template_name.text().strip()
                if not name:
                    name = f"Template_{len(self.templates) + 1}"
                
                # Create new template
                new_template = {
                    field: combo.currentText()
                    for field, combo in combo_boxes.items()
                }
                
                # Save template
                self.templates[name] = new_template
                self.save_templates()
                
                # Apply the new template
                self.apply_template(new_template)
                
                QMessageBox.information(
                    self,
                    "Template Created",
                    f"Template '{name}' has been created and applied."
                )
                
        except Exception as e:
            print(f"Error suggesting template: {str(e)}")
            traceback.print_exc()
            QMessageBox.warning(self, "Error", "Could not create template suggestion.")

    def apply_template(self, template):
        """Apply a template to the current view"""
        try:
            if template.get('track_column'):
                self.track_column.setCurrentText(template['track_column'])
            if template.get('artist_column'):
                self.artist_column.setCurrentText(template['artist_column'])
            if template.get('upc_column'):
                self.upc_column.setCurrentText(template['upc_column'])
            if template.get('revenue_column'):
                self.revenue_column.setCurrentText(template['revenue_column'])
            if template.get('date_column'):
                self.date_column.setCurrentText(template['date_column'])
                
            # Update filters after applying template
            self.update_filters()
            
        except Exception as e:
            print(f"Error applying template: {str(e)}")
            traceback.print_exc()

    def calculate_artist_revenue(self, revenue):
        """Calculate artist revenue based on percentage and advances"""
        try:
            percentage = float(self.artist_percentage.text())
            artist_revenue = (revenue * percentage) / 100
            return artist_revenue
        except ValueError:
            QMessageBox.warning(self, "Warning", "Invalid artist percentage. Using 100%")
            return revenue

    def get_advances(self):
        """Get advances amount, return 0 if invalid"""
        try:
            return float(self.advances.text() or "0")
        except ValueError:
            QMessageBox.warning(self, "Warning", "Invalid advances amount. Using 0")
            return 0

    def validate_dates(self):
        """Validate that From date is not after To date"""
        from_date = self.date_from.date()
        to_date = self.date_to.date()
        
        if from_date > to_date:
            QMessageBox.warning(self, "Invalid Dates", 
                "The From date cannot be after the To date. Adjusting dates automatically.")
            # Set From date to one month before To date
            self.date_from.setDate(to_date.addMonths(-1))
            return False
        return True

    def parse_date(self, date_str):
        """Parse date string trying multiple common formats"""
        if pd.isna(date_str) or date_str == '':
            return None
            
        date_formats = [
            '%Y-%m-%d',     # 2024-01-31
            '%d/%m/%Y',     # 31/01/2024
            '%m/%d/%Y',     # 01/31/2024
            '%d-%m-%Y',     # 31-01-2024
            '%Y/%m/%d',     # 2024/01/31
            '%d.%m.%Y',     # 31.01.2024
            '%Y%m%d',       # 20240131
            '%b %Y',        # Jan 2024
            '%B %Y',        # January 2024
            '%Y-%m',        # 2024-01
            '%m/%Y',        # 01/2024
            '%m-%Y',        # 01-2024
        ]
        
        # First try exact formats
        for date_format in date_formats:
            try:
                return pd.to_datetime(date_str, format=date_format)
            except:
                continue
        
        # If no exact format works, try pandas' flexible parser
        try:
            return pd.to_datetime(date_str)
        except:
            return None

    def update_filters(self):
        """Update both track and artist filters"""
        try:
            if self.csv_files and self.track_column.currentText() and self.artist_column.currentText():
                # Read all unique tracks and artists from the files
                all_tracks = set()
                all_artists = set()
                
                for file in self.csv_files:
                    try:
                        df = self.read_csv_file(file)
                        if df is not None:
                            track_col = self.track_column.currentText()
                            artist_col = self.artist_column.currentText()
                            
                            if track_col in df.columns:
                                tracks = df[track_col].fillna('').astype(str).str.strip()
                                all_tracks.update(track for track in tracks.unique() if track)
                            
                            if artist_col in df.columns:
                                artists = df[artist_col].fillna('').astype(str).str.strip()
                                all_artists.update(artist for artist in artists.unique() if artist)
                    except Exception as e:
                        print(f"Error reading data from {os.path.basename(file)}: {str(e)}")
                        continue

                # Update track filter
                self.track_filter.clear()
                self.track_filter.addItem("All Tracks")
                for track in sorted(all_tracks, key=str.lower):
                    self.track_filter.addItem(track)

                # Update artist filter
                self.artist_filter.clear()
                self.artist_filter.addItem("All Artists")
                for artist in sorted(all_artists, key=str.lower):
                    self.artist_filter.addItem(artist)

        except Exception as e:
            QMessageBox.warning(self, "Warning", f"Error updating filters: {str(e)}")

    def get_selected_artists(self):
        """Get list of selected artists"""
        return [item.text() for item in self.artist_filter.selectedItems()]

    def analyze_revenue(self):
        print("\n=== Starting revenue analysis ===")
        if not self.csv_files:
            QMessageBox.warning(self, "Warning", "Please add at least one CSV file to analyze.")
            return

        # Validate dates before proceeding
        if not self.validate_dates():
            return

        try:
            # Get selected column names
            track_col = self.track_column.currentText()
            artist_col = self.artist_column.currentText()
            revenue_col = self.revenue_column.currentText()
            date_col = self.date_column.currentText()

            print(f"\nSelected columns:")
            print(f"- Track: {track_col}")
            print(f"- Artist: {artist_col}")
            print(f"- Revenue: {revenue_col}")
            print(f"- Date: {date_col}")

            if not track_col or not revenue_col or not date_col:
                QMessageBox.warning(self, "Warning", "Please select all required columns (Track, Revenue, Date).")
                return

            # Verify revenue column is not the same as artist column
            if artist_col and artist_col == revenue_col:
                QMessageBox.warning(self, "Warning", "Revenue column cannot be the same as Artist column.")
                return

            # Read and combine all CSV files
            print("\nProcessing CSV files...")
            all_data = []
            for file in self.csv_files:
                try:
                    print(f"\nReading file: {file}")
                    df = self.read_csv_file(file)
                    if df is not None:
                        print(f"File loaded successfully. Shape: {df.shape}")
                        
                        # Clean and convert data
                        print("Cleaning track column...")
                        df[track_col] = df[track_col].fillna('').astype(str).str.strip()
                        
                        print("Converting revenue values...")
                        df[revenue_col] = df[revenue_col].apply(self.clean_revenue_value)
                        
                        if artist_col:
                            print("Processing artist column...")
                            df[artist_col] = df[artist_col].fillna('').astype(str).str.strip()
                        
                        print("Parsing dates...")
                        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
                        
                        # Remove invalid rows
                        print("Filtering valid rows...")
                        valid_mask = (
                            (df[track_col].str.len() > 0) & 
                            (df[revenue_col] != 0) &
                            (df[date_col].notna())
                        )
                        df = df[valid_mask]
                        
                        if not df.empty:
                            print(f"Adding {len(df)} valid rows")
                            df['Source File'] = os.path.basename(file)
                            all_data.append(df)
                        else:
                            print("No valid data found in file after filtering")
                except Exception as e:
                    print(f"Error processing file {file}:")
                    print(str(e))
                    traceback.print_exc()
                    continue

            if not all_data:
                QMessageBox.warning(self, "Warning", "No valid data found in the CSV files.")
                return
                
            print("\nCombining all data...")
            # Combine all files
            combined_df = pd.concat(all_data, ignore_index=True)
            print(f"Combined data shape: {combined_df.shape}")

            # Apply filters
            print("\nApplying filters...")
            filters = []
            
            selected_tracks = self.get_selected_tracks()
            if selected_tracks and "All Tracks" not in selected_tracks:
                print(f"Filtering for tracks: {selected_tracks}")
                filters.append(combined_df[track_col].isin(selected_tracks))

            selected_artists = self.get_selected_artists()
            if selected_artists and "All Artists" not in selected_artists and artist_col:
                print(f"Filtering for artists: {selected_artists}")
                filters.append(combined_df[artist_col].isin(selected_artists))

            # Apply date range filter
            start_date = pd.to_datetime(self.date_from.date().toPyDate())
            end_date = pd.to_datetime(self.date_to.date().toPyDate())
            print(f"Date range: {start_date} to {end_date}")
            
            filters.append(combined_df[date_col] >= start_date)
            filters.append(combined_df[date_col] <= end_date)

            # Apply all filters
            print("Finalizing data filtering...")
            if filters:
                final_filter = filters[0]
                for f in filters[1:]:
                    final_filter = final_filter & f
                filtered_df = combined_df[final_filter]
            else:
                filtered_df = combined_df

            print(f"Filtered data shape: {filtered_df.shape}")

            if filtered_df.empty:
                QMessageBox.warning(self, "Warning", "No data found after applying filters.")
                return

            print("\nPreparing results...")
            # Add period column based on grouping selection
            period_format = '%Y-%m' if self.period_group.currentText() == 'Month' else '%Y-Q%q' if self.period_group.currentText() == 'Quarter' else '%Y'
            filtered_df['Period'] = filtered_df[date_col].dt.strftime(period_format)

            # Group by period and track, calculate revenue
            print("Calculating revenue by period...")
            revenue_by_period = filtered_df.groupby(['Period', track_col])[revenue_col].sum().reset_index()
            revenue_by_period = revenue_by_period.sort_values(['Period', track_col])

            # Calculate period totals
            period_totals = filtered_df.groupby('Period')[revenue_col].sum().reset_index()

            # Calculate grand total
            print("Calculating totals...")
            grand_total = filtered_df[revenue_col].sum()

            # Calculate net totals after advances
            net_total = max(0, grand_total - self.get_advances())

            # Format results for display
            print("\nFormatting results...")
            target_currency = self.currency_combo.currentText()
            formatted_results = []
            
            print("Processing results rows...")
            for _, row in revenue_by_period.iterrows():
                try:
                    result = {
                        'Period': str(row['Period']),
                        'Track': str(row[track_col]),
                        'Total Revenue': f"{float(row[revenue_col]):.2f} {target_currency}",
                        'Artist Revenue': f"{float(row[revenue_col]):.2f} {target_currency}"  # Same as Total Revenue
                    }
                    
                    # Add artist if available
                    if artist_col:
                        artist_data = filtered_df[
                            filtered_df[track_col] == row[track_col]
                        ][artist_col].iloc[0] if not filtered_df.empty else ''
                        result['Artist'] = str(artist_data)
                    
                    formatted_results.append(result)
                except Exception as e:
                    print(f"Error formatting row:")
                    print(f"Row data: {row}")
                    print(f"Error: {str(e)}")
                    continue

            print(f"\nFormatted {len(formatted_results)} result rows")

            # Create summary text
            print("\nCreating summary...")
            summary_text = [f"""
Revenue Analysis Summary:
------------------------
Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}
Grouped by: {self.period_group.currentText()}

Total Revenue: {grand_total:.2f} {target_currency}
Advances to Recoup: {self.get_advances():.2f} {target_currency}
Net Revenue: {net_total:.2f} {target_currency}

Filters applied:
- Tracks: {', '.join(selected_tracks) if selected_tracks else 'All'}
- Artists: {', '.join(selected_artists) if selected_artists else 'All'}

Number of transactions: {len(filtered_df)}
            """]

            # Store current results for later use
            print("\nStoring results...")
            self.current_results = formatted_results
            self.current_summary = summary_text
            
            # Update history list
            print("Updating history...")
            self.update_history_list()

            try:
                # Show results window
                print("\nOpening results window...")
                print(f"Number of results: {len(formatted_results)}")
                print(f"First result sample: {formatted_results[0] if formatted_results else 'No results'}")
                self.results_window = ResultsWindow(formatted_results, summary_text, self)
                self.results_window.show()
                print("Results window displayed successfully")
            except Exception as e:
                print("\nError showing results window:")
                print(str(e))
                traceback.print_exc()
                QMessageBox.critical(self, "Error", f"Failed to show results: {str(e)}")

        except Exception as e:
            print("\nError in analyze_revenue:")
            print(str(e))
            traceback.print_exc()
            QMessageBox.critical(self, "Error", f"An error occurred during analysis: {str(e)}")

    def merge_selected_tracks(self):
        """Merge all imported CSV files keeping only selected tracks and all original columns"""
        if not self.csv_files:
            QMessageBox.warning(self, "Warning", "Please add at least one CSV file to merge.")
            return

        try:
            # Get selected tracks
            selected_tracks = self.get_selected_tracks()
            if not selected_tracks or (len(selected_tracks) == 1 and selected_tracks[0] == "All Tracks"):
                QMessageBox.warning(self, "Warning", "Please select at least one track to merge.")
                return

            # Get column names
            track_col = self.track_column.currentText()
            if not track_col:
                QMessageBox.warning(self, "Warning", "Please select the track column first.")
                return

            # Read and combine all CSV files
            all_data = []
            for file in self.csv_files:
                df = pd.read_csv(file, low_memory=False)
                # Convert track column to string
                df[track_col] = df[track_col].fillna('').astype(str)
                # Add source file column
                df['Source File'] = os.path.basename(file)
                all_data.append(df)
            
            # Combine all files
            combined_df = pd.concat(all_data, ignore_index=True)

            # Filter for selected tracks
            filtered_df = combined_df[combined_df[track_col].isin(selected_tracks)]

            if filtered_df.empty:
                QMessageBox.warning(self, "Warning", "No data found for selected tracks.")
                return

            # Save merged results
            default_filename = f"merged_tracks_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            save_path, _ = QFileDialog.getSaveFileName(
                self,
                "Save Merged Results",
                self.get_export_path(default_filename),
                "CSV Files (*.csv)"
            )
            
            if save_path:
                # Sort by track and date if date column is selected
                sort_columns = [track_col]
                if self.date_column.currentText():
                    date_col = self.date_column.currentText()
                    if date_col in filtered_df.columns:
                        filtered_df[date_col] = pd.to_datetime(filtered_df[date_col])
                        sort_columns.insert(0, date_col)
                
                # Sort and save
                filtered_df = filtered_df.sort_values(sort_columns)
                filtered_df.to_csv(save_path, index=False)
                
                # Show summary
                summary = f"""
Merge Summary:
-------------
Number of files merged: {len(self.csv_files)}
Tracks included: {', '.join(selected_tracks)}
Total rows: {len(filtered_df)}
Columns: {', '.join(filtered_df.columns)}
                """
                QMessageBox.information(self, "Merge Complete", summary)

        except Exception as e:
            QMessageBox.critical(self, "Error", f"An error occurred during merge: {str(e)}")

    def refresh_interface(self):
        """Refresh the interface while keeping loaded files"""
        try:
            # Store current files
            current_files = self.csv_files.copy()
            
            # Clear column selections
            self.track_column.clear()
            self.artist_column.clear()
            self.upc_column.clear()
            self.revenue_column.clear()
            self.date_column.clear()
            
            # Clear track filter
            self.track_filter.clear()
            
            # Reset date range to default
            self.date_from.setDate(QDate.currentDate().addMonths(-1))
            self.date_to.setDate(QDate.currentDate())
            
            # Reset period grouping to default
            self.period_group.setCurrentText('Month')
            
            # Reset currency to first option
            self.currency_combo.setCurrentIndex(0)
            
            # Reset artist percentage to default
            self.artist_percentage.setText("50")
            
            # Reset advances to default
            self.advances.setText("0")
            
            # Clear file list widget
            self.file_list.clear()
            
            # Re-add files and update columns
            self.csv_files = []
            for file in current_files:
                if os.path.exists(file):  # Only re-add files that still exist
                    self.csv_files.append(file)
                    self.file_list.addItem(os.path.basename(file))
            
            # Update column selections if files exist
            if self.csv_files:
                self.update_column_lists()
                
            QMessageBox.information(self, "Refresh Complete", "Interface has been refreshed.")
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"An error occurred while refreshing: {str(e)}")

    def clean_import(self):
        """Clean only the file import section"""
        try:
            reply = QMessageBox.question(self, "Confirm Clean Import",
                                       "Are you sure you want to clear all imported files?",
                                       QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
            
            if reply == QMessageBox.StandardButton.Yes:
                # Clear file list
                self.file_list.clear()
                self.csv_files = []
                
                # Clear track filter
                self.track_filter.clear()
                self.track_filter.addItem("All Tracks")
                
                # Clear column selections but keep the current mapping template if any
                current_mappings = {
                    'track': self.track_column.currentText(),
                    'artist': self.artist_column.currentText(),
                    'upc': self.upc_column.currentText(),
                    'revenue': self.revenue_column.currentText(),
                    'date': self.date_column.currentText()
                }
                
                self.track_column.clear()
                self.artist_column.clear()
                self.upc_column.clear()
                self.revenue_column.clear()
                self.date_column.clear()
                
                # Restore previous mappings if they exist
                if current_mappings['track']:
                    self.track_column.addItem(current_mappings['track'])
                if current_mappings['artist']:
                    self.artist_column.addItem(current_mappings['artist'])
                if current_mappings['upc']:
                    self.upc_column.addItem(current_mappings['upc'])
                if current_mappings['revenue']:
                    self.revenue_column.addItem(current_mappings['revenue'])
                if current_mappings['date']:
                    self.date_column.addItem(current_mappings['date'])
                
                QMessageBox.information(self, "Import Cleaned", "All imported files have been cleared.")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"An error occurred while cleaning import: {str(e)}")

    def clear_all(self):
        """Clear all data and reset interface"""
        reply = QMessageBox.question(self, "Clear All",
            "Are you sure you want to clear all data and reset the interface?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No)
            
        try:
            if reply == QMessageBox.StandardButton.Yes:
                # Clear file list
                self.file_list.clear()
                self.csv_files = []
                
                # Clear column selections
                self.track_column.clear()
                self.artist_column.clear()
                self.upc_column.clear()
                self.revenue_column.clear()
                self.date_column.clear()
                
                # Clear track filter
                self.track_filter.clear()
                self.track_filter.addItem("All Tracks")
                
                # Reset date range to default
                self.date_from.setDate(QDate.currentDate().addMonths(-1))
                self.date_to.setDate(QDate.currentDate())
                
                # Reset period grouping to default
                self.period_group.setCurrentText('Month')
                
                # Reset currency to first option
                self.currency_combo.setCurrentIndex(0)
                
                # Reset artist percentage to default
                self.artist_percentage.setText("50")
                
                # Reset advances to default
                self.advances.setText("0")
                
                QMessageBox.information(self, "Clear Complete", "All data and settings have been cleared.")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"An error occurred while clearing: {str(e)}")

    def keyPressEvent(self, event):
        """Handle keyboard shortcuts"""
        if event.key() == Qt.Key.Key_F5:  # F5 key for refresh
            self.refresh_interface()
        elif event.modifiers() & Qt.KeyboardModifier.ControlModifier and event.key() == Qt.Key.Key_R:  # Ctrl+R for refresh
            self.refresh_interface()
        super().keyPressEvent(event)

    def load_templates(self):
        """Load saved templates from JSON file"""
        try:
            if os.path.exists(self.templates_file):
                with open(self.templates_file, 'r') as f:
                    self.templates = json.load(f)
            else:
                self.templates = {}
        except Exception as e:
            self.templates = {}
            QMessageBox.warning(self, "Warning", f"Could not load templates: {str(e)}")

    def save_templates(self):
        """Save templates to JSON file"""
        try:
            os.makedirs(os.path.dirname(self.templates_file), exist_ok=True)
            with open(self.templates_file, 'w') as f:
                json.dump(self.templates, f, indent=4)
        except Exception as e:
            QMessageBox.warning(self, "Warning", f"Could not save templates: {str(e)}")

    def save_template(self):
        """Save current column mapping as a template"""
        try:
            # Get template name from user
            name, ok = QInputDialog.getText(self, "Save Template", 
                                          "Enter template name:",
                                          QLineEdit.EchoMode.Normal)
            if ok and name:
                # Create template from current selections
                template = {
                    'track_column': self.track_column.currentText(),
                    'artist_column': self.artist_column.currentText(),
                    'upc_column': self.upc_column.currentText(),
                    'revenue_column': self.revenue_column.currentText(),
                    'date_column': self.date_column.currentText()
                }
                
                # Save template
                self.templates[name] = template
                self.save_templates()
                
                QMessageBox.information(self, "Success", f"Template '{name}' saved successfully.")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Could not save template: {str(e)}")

    def load_template(self):
        """Load a saved template"""
        try:
            if not self.templates:
                QMessageBox.warning(self, "Warning", "No templates available.")
                return
            
            if not self.csv_files:
                QMessageBox.warning(self, "Warning", "Please load a CSV file first.")
                return
            
            # Let user select template
            template_name, ok = QInputDialog.getItem(self, "Load Template",
                                                   "Select template:",
                                                   list(self.templates.keys()),
                                                   0, False)
            
            if ok and template_name:
                template = self.templates[template_name]
                
                # Update available columns from current CSV files
                self.update_column_lists()
                
                # Apply template if columns exist in current file
                if template['track_column'] in self.available_columns:
                    self.track_column.setCurrentText(template['track_column'])
                if template['artist_column'] in self.available_columns:
                    self.artist_column.setCurrentText(template['artist_column'])
                if template['upc_column'] in self.available_columns:
                    self.upc_column.setCurrentText(template['upc_column'])
                if template['revenue_column'] in self.available_columns:
                    self.revenue_column.setCurrentText(template['revenue_column'])
                if template['date_column'] in self.available_columns:
                    self.date_column.setCurrentText(template['date_column'])
                
                QMessageBox.information(self, "Success", f"Template '{template_name}' loaded successfully.")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Could not load template: {str(e)}")

    def delete_template(self):
        """Delete a saved template"""
        try:
            if not self.templates:
                QMessageBox.warning(self, "Warning", "No templates available.")
                return
            
            # Let user select template to delete
            template_name, ok = QInputDialog.getItem(self, "Delete Template",
                                                   "Select template to delete:",
                                                   list(self.templates.keys()),
                                                   0, False)
            
            if ok and template_name:
                del self.templates[template_name]
                self.save_templates()
                QMessageBox.information(self, "Success", f"Template '{template_name}' deleted successfully.")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Could not delete template: {str(e)}")

    def load_analysis_history(self):
        """Load saved analysis history from JSON file"""
        try:
            if os.path.exists(self.results_file):
                with open(self.results_file, 'r') as f:
                    self.analysis_history = json.load(f)
            else:
                self.analysis_history = {}
        except Exception as e:
            self.analysis_history = {}
            QMessageBox.warning(self, "Warning", f"Could not load analysis history: {str(e)}")

    def save_analysis_history(self):
        """Save analysis history to JSON file"""
        try:
            os.makedirs(os.path.dirname(self.results_file), exist_ok=True)
            with open(self.results_file, 'w') as f:
                json.dump(self.analysis_history, f, indent=4)
        except Exception as e:
            QMessageBox.warning(self, "Warning", f"Could not save analysis history: {str(e)}")

    def save_analysis(self):
        """Save current analysis results to history"""
        try:
            if not hasattr(self, 'current_results'):
                QMessageBox.warning(self, "Warning", "No analysis results to save.")
                return

            # Get current template name
            current_template = "No Template"
            for name, template in self.templates.items():
                if (template['track_column'] == self.track_column.currentText() and
                    template['artist_column'] == self.artist_column.currentText() and
                    template['upc_column'] == self.upc_column.currentText() and
                    template['revenue_column'] == self.revenue_column.currentText() and
                    template['date_column'] == self.date_column.currentText()):
                    current_template = name
                    break

            # Generate default name with date, time and template
            default_name = f"{datetime.now().strftime('%Y-%m-%d %H:%M')} [{current_template}]"

            # Get analysis name from user
            name, ok = QInputDialog.getText(self, "Save Analysis", 
                                          "Enter analysis name:",
                                          QLineEdit.EchoMode.Normal,
                                          text=default_name)
            if ok and name:
                # Save current results
                self.analysis_history[name] = {
                    'date': datetime.now().isoformat(),
                    'template': current_template,
                    'results': self.current_results,
                    'summary': self.current_summary
                }
                self.save_analysis_history()
                self.update_history_list()
                QMessageBox.information(self, "Success", f"Analysis '{name}' saved successfully.")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Could not save analysis: {str(e)}")

    def update_history_list(self):
        """Update the history list widget with saved analyses"""
        self.history_list.clear()
        for name in sorted(self.analysis_history.keys(), reverse=True):
            analysis = self.analysis_history[name]
            display_text = f"{name}"
            if 'template' in analysis and analysis['template'] != "No Template":
                display_text = f"{name} - Template: {analysis['template']}"
            item = QListWidgetItem(display_text)
            self.history_list.addItem(item)

    def load_analysis(self, item):
        """Load a saved analysis"""
        if not item:
            return
            
        try:
            name = item.text()
            analysis = self.analysis_history[name]
            
            # Load the results into the current view
            self.current_results = analysis['results']
            self.current_summary = analysis['summary']
            
            # Update tables with the loaded data
            self.display_results(self.current_results)
            
            QMessageBox.information(self, "Success", f"Analysis '{name}' loaded successfully.")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Could not load analysis: {str(e)}")

    def delete_analysis(self):
        """Delete selected analysis from history"""
        item = self.history_list.currentItem()
        if not item:
            return
            
        try:
            name = item.text()
            reply = QMessageBox.question(self, "Confirm Delete",
                                       f"Are you sure you want to delete analysis '{name}'?",
                                       QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
            
            if reply == QMessageBox.StandardButton.Yes:
                del self.analysis_history[name]
                self.save_analysis_history()
                self.update_history_list()
                QMessageBox.information(self, "Success", f"Analysis '{name}' deleted successfully.")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Could not delete analysis: {str(e)}")

    def combine_with_previous(self):
        """Combine current results with selected previous analyses"""
        if not hasattr(self, 'current_results'):
            QMessageBox.warning(self, "Warning", "No current analysis results.")
            return
            
        if not self.analysis_history:
            QMessageBox.warning(self, "Warning", "No previous analyses to combine with.")
            return
            
        try:
            # Create dialog for selecting multiple analyses
            dialog = QDialog(self)
            dialog.setWindowTitle("Combine Analyses")
            layout = QVBoxLayout(dialog)
            
            # Analysis selection list
            layout.addWidget(QLabel("Select analyses to combine:"))
            analysis_list = QListWidget()
            analysis_list.setSelectionMode(QListWidget.SelectionMode.MultiSelection)
            for name in self.analysis_history.keys():
                item = QListWidgetItem(name)
                analysis_list.addItem(item)
            layout.addWidget(analysis_list)
            
            # Export options
            options_group = QGroupBox("Export Options")
            options_layout = QVBoxLayout()
            
            # Add source column option
            add_source_cb = QCheckBox("Add distribution source column")
            add_source_cb.setChecked(True)
            options_layout.addWidget(add_source_cb)
            
            # Consolidate duplicate tracks option
            consolidate_cb = QCheckBox("Consolidate duplicate tracks")
            consolidate_cb.setChecked(True)
            options_layout.addWidget(consolidate_cb)
            
            options_group.setLayout(options_layout)
            layout.addWidget(options_group)
            
            # Buttons
            buttons = QHBoxLayout()
            combine_button = QPushButton("Combine")
            cancel_button = QPushButton("Cancel")
            buttons.addWidget(combine_button)
            buttons.addWidget(cancel_button)
            layout.addLayout(buttons)
            
            # Connect buttons
            combine_button.clicked.connect(dialog.accept)
            cancel_button.clicked.connect(dialog.reject)
            
            if dialog.exec() == QDialog.DialogCode.Accepted:
                selected_items = analysis_list.selectedItems()
                if not selected_items:
                    QMessageBox.warning(self, "Warning", "Please select at least one analysis to combine with.")
                    return
                
                # Collect all results
                all_results = []
                sources = set()
                
                # Add current results
                current_template = "No Template"
                for name, template in self.templates.items():
                    if (template['track_column'] == self.track_column.currentText() and
                        template['revenue_column'] == self.revenue_column.currentText() and
                        template['date_column'] == self.date_column.currentText()):
                        current_template = name
                        break
                
                for result in self.current_results:
                    result_copy = result.copy()
                    if add_source_cb.isChecked():
                        source = self.templates.get(current_template, {}).get('source', current_template)
                        result_copy['Source'] = source
                        sources.add(source)
                    all_results.append(result_copy)
                
                # Add selected analyses
                for item in selected_items:
                    analysis = self.analysis_history[item.text()]
                    template_name = analysis['template']
                    
                    for result in analysis['results']:
                        result_copy = result.copy()
                        if add_source_cb.isChecked():
                            source = self.templates.get(template_name, {}).get('source', template_name)
                            result_copy['Source'] = source
                            sources.add(source)
                        all_results.append(result_copy)
                
                # Consolidate results if requested
                if consolidate_cb.isChecked():
                    consolidated_results = {}
                    for result in all_results:
                        key = (result['Period'], result['Track'])
                        if key not in consolidated_results:
                            consolidated_results[key] = result.copy()
                        else:
                            # Add revenues
                            total_rev = float(consolidated_results[key]['Total Revenue'].split()[0]) + float(result['Total Revenue'].split()[0])
                            artist_rev = float(consolidated_results[key]['Artist Revenue'].split()[0]) + float(result['Artist Revenue'].split()[0])
                            currency = result['Total Revenue'].split()[1]
                            
                            consolidated_results[key]['Total Revenue'] = f"{total_rev:.2f} {currency}"
                            consolidated_results[key]['Artist Revenue'] = f"{artist_rev:.2f} {currency}"
                            
                            if 'Source' in result:
                                if 'Source' in consolidated_results[key]:
                                    consolidated_results[key]['Source'] += f", {result['Source']}"
                                else:
                                    consolidated_results[key]['Source'] = result['Source']
                    
                    all_results = list(consolidated_results.values())
                
                # Sort results by period and track
                all_results.sort(key=lambda x: (x['Period'], x['Track']))
                
                # Update current results
                self.current_results = all_results
                
                # Update summary text
                summary_lines = []
                if self.current_summary:
                    summary_lines.extend(self.current_summary)
                summary_lines.append("\nCombined with:")
                for item in selected_items:
                    summary_lines.append(f"- {item.text()}")
                if sources:
                    summary_lines.append("\nDistribution Sources:")
                    for source in sorted(sources):
                        summary_lines.append(f"- {source}")
                self.current_summary = summary_lines
                
                # Show results
                self.display_results(self.current_results)
                
                QMessageBox.information(self, "Success", "Results combined successfully.")
                
        except Exception as e:
            print(f"Error combining analyses: {str(e)}")
            traceback.print_exc()
            QMessageBox.critical(self, "Error", f"Could not combine analyses: {str(e)}")

    def display_results(self, results_data):
        """Display results in the tables"""
        try:
            # Create and show results window
            self.results_window = ResultsWindow(results_data, self.current_summary, self)
            self.results_window.show()
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Could not display results: {str(e)}")
            print(f"Error details: {str(e)}")  # Add detailed error logging

    def edit_template(self):
        """Edit an existing template"""
        try:
            if not self.templates:
                QMessageBox.warning(self, "Warning", "No templates available to edit.")
                return
            
            # Let user select template to edit
            template_name, ok = QInputDialog.getItem(self, "Edit Template",
                                                   "Select template to edit:",
                                                   list(self.templates.keys()),
                                                   0, False)
            
            if ok and template_name:
                template = self.templates[template_name]
                
                # Create dialog for template editing
                dialog = QDialog(self)
                dialog.setWindowTitle(f"Edit Template: {template_name}")
                layout = QVBoxLayout(dialog)
                
                # Template name input
                name_layout = QHBoxLayout()
                name_layout.addWidget(QLabel("Template Name:"))
                new_name = QLineEdit(template_name)
                name_layout.addWidget(new_name)
                layout.addLayout(name_layout)
                
                # Column mappings
                mappings_group = QGroupBox("Column Mappings")
                mappings_layout = QGridLayout()
                
                # Create combo boxes for each field
                combo_boxes = {}
                fields = [
                    ('track_column', 'Track'),
                    ('artist_column', 'Artist'),
                    ('upc_column', 'UPC'),
                    ('revenue_column', 'Revenue'),
                    ('date_column', 'Date')
                ]
                
                for i, (field, label) in enumerate(fields):
                    # Create label
                    mappings_layout.addWidget(QLabel(f"{label}:"), i, 0)
                    
                    # Create combo box with custom input
                    combo = QComboBox()
                    combo.setEditable(True)
                    
                    # Add empty option and available columns
                    combo.addItem("")
                    if self.available_columns:
                        for col in self.available_columns:
                            combo.addItem(col)
                    
                    # Get current value from template
                    current_value = template.get(field, '')
                    if current_value:
                        # Check if value exists in combo box
                        index = combo.findText(current_value)
                        if index == -1:  # Value not found
                            combo.addItem(current_value)
                        combo.setCurrentText(current_value)
                    
                    combo_boxes[field] = combo
                    mappings_layout.addWidget(combo, i, 1)
                
                mappings_group.setLayout(mappings_layout)
                layout.addWidget(mappings_group)
                
                # Add distribution source field
                source_layout = QHBoxLayout()
                source_layout.addWidget(QLabel("Distribution Source:"))
                source_input = QLineEdit(template.get('source', ''))
                source_layout.addWidget(source_input)
                layout.addLayout(source_layout)
                
                # Buttons
                buttons = QHBoxLayout()
                save_button = QPushButton("Save")
                cancel_button = QPushButton("Cancel")
                buttons.addWidget(save_button)
                buttons.addWidget(cancel_button)
                layout.addLayout(buttons)
                
                # Connect buttons
                save_button.clicked.connect(dialog.accept)
                cancel_button.clicked.connect(dialog.reject)
                
                if dialog.exec() == QDialog.DialogCode.Accepted:
                    # Get the new template name
                    new_template_name = new_name.text().strip()
                    if not new_template_name:
                        new_template_name = template_name
                    
                    # Create updated template
                    updated_template = {
                        field: combo.currentText()
                        for field, combo in combo_boxes.items()
                    }
                    
                    # Add source information
                    updated_template['source'] = source_input.text().strip()
                    
                    # If name changed, delete old template
                    if new_template_name != template_name:
                        del self.templates[template_name]
                    
                    # Save updated template
                    self.templates[new_template_name] = updated_template
                    self.save_templates()
                    
                    QMessageBox.information(
                        self,
                        "Success",
                        f"Template '{new_template_name}' updated successfully."
                    )
                    
        except Exception as e:
            print(f"Error editing template: {str(e)}")
            traceback.print_exc()
            QMessageBox.critical(self, "Error", f"Could not edit template: {str(e)}")

class ChartTheme:
    def __init__(self, name, colors, background_color, grid_color, text_color):
        self.name = name
        self.colors = colors
        self.background_color = background_color
        self.grid_color = grid_color
        self.text_color = text_color

    @classmethod
    def default_themes(cls):
        return {
            'Light': cls(
                'Light',
                [
                    QColor(41, 128, 185),   # Blue
                    QColor(192, 57, 43),    # Red
                    QColor(39, 174, 96),    # Green
                    QColor(243, 156, 18),   # Orange
                    QColor(142, 68, 173),   # Purple
                    QColor(22, 160, 133),   # Turquoise
                    QColor(211, 84, 0),     # Dark Orange
                    QColor(52, 152, 219),   # Light Blue
                    QColor(46, 204, 113),   # Emerald
                    QColor(155, 89, 182)    # Amethyst
                ],
                QColor(248, 249, 250),      # Light background
                QColor(200, 200, 200),      # Light grid
                QColor(0, 0, 0)             # Black text
            ),
            'Dark': cls(
                'Dark',
                [
                    QColor(52, 152, 219),   # Blue
                    QColor(231, 76, 60),    # Red
                    QColor(46, 204, 113),   # Green
                    QColor(241, 196, 15),   # Yellow
                    QColor(155, 89, 182),   # Purple
                    QColor(26, 188, 156),   # Turquoise
                    QColor(230, 126, 34),   # Orange
                    QColor(52, 73, 94),     # Dark Blue
                    QColor(22, 160, 133),   # Green Sea
                    QColor(142, 68, 173)    # Wisteria
                ],
                QColor(44, 47, 51),         # Dark background
                QColor(70, 70, 70),         # Dark grid
                QColor(255, 255, 255)       # White text
            ),
            'Pastel': cls(
                'Pastel',
                [
                    QColor(174, 214, 241),  # Pastel Blue
                    QColor(250, 219, 216),  # Pastel Red
                    QColor(213, 245, 227),  # Pastel Green
                    QColor(253, 235, 208),  # Pastel Orange
                    QColor(232, 218, 239),  # Pastel Purple
                    QColor(214, 246, 241),  # Pastel Turquoise
                    QColor(250, 229, 211),  # Pastel Peach
                    QColor(208, 236, 231),  # Pastel Mint
                    QColor(240, 219, 219),  # Pastel Pink
                    QColor(215, 219, 221)   # Pastel Gray
                ],
                QColor(255, 255, 255),      # White background
                QColor(220, 220, 220),      # Light grid
                QColor(100, 100, 100)       # Dark gray text
            )
        }

if __name__ == "__main__":
    print("Creating QApplication instance...")
    app = QApplication(sys.argv)
    print("Creating main window...")
    window = CSVMergeApp()
    print("Showing main window...")
    window.show()
    print("Entering main event loop...")
    sys.exit(app.exec()) 