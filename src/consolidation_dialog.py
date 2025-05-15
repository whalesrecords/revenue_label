from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel,
                           QListWidget, QComboBox, QPushButton, QWidget,
                           QListWidgetItem)
from PyQt6.QtCore import Qt

class ConsolidationDialog(QDialog):
    def __init__(self, columns, parent=None):
        super().__init__(parent)
        self.columns = columns
        self.selected_keys = []
        self.operations = {}
        self.setup_ui()

    def setup_ui(self):
        self.setWindowTitle("Consolidation Options")
        self.setMinimumSize(600, 400)
        
        layout = QVBoxLayout(self)
        
        # Key columns selection
        key_section = QWidget()
        key_layout = QVBoxLayout(key_section)
        key_layout.addWidget(QLabel("Select Key Columns:"))
        
        self.key_list = QListWidget()
        self.key_list.setSelectionMode(QListWidget.SelectionMode.MultiSelection)
        for column in self.columns:
            self.key_list.addItem(column)
        key_layout.addWidget(self.key_list)
        
        layout.addWidget(key_section)
        
        # Operations selection
        op_section = QWidget()
        op_layout = QVBoxLayout(op_section)
        op_layout.addWidget(QLabel("Select Operations for Other Columns:"))
        
        self.op_list = QListWidget()
        for column in self.columns:
            item = QListWidgetItem(column)
            item.setFlags(item.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            item.setCheckState(Qt.CheckState.Unchecked)
            self.op_list.addItem(item)
            
            # Operation combo box
            combo = QComboBox()
            combo.addItems(['Union', 'Join', 'Total'])
            combo.setProperty('column', column)
            combo.currentTextChanged.connect(self.operation_changed)
            self.op_list.setItemWidget(item, combo)
        
        op_layout.addWidget(self.op_list)
        layout.addWidget(op_section)
        
        # Buttons
        button_layout = QHBoxLayout()
        ok_button = QPushButton("OK")
        ok_button.clicked.connect(self.accept)
        cancel_button = QPushButton("Cancel")
        cancel_button.clicked.connect(self.reject)
        button_layout.addStretch()
        button_layout.addWidget(ok_button)
        button_layout.addWidget(cancel_button)
        layout.addLayout(button_layout)

    def operation_changed(self, operation):
        combo = self.sender()
        column = combo.property('column')
        self.operations[column] = operation

    def get_key_columns(self):
        return [item.text() for item in self.key_list.selectedItems()]

    def get_operations(self):
        operations = {}
        for i in range(self.op_list.count()):
            item = self.op_list.item(i)
            if item.checkState() == Qt.CheckState.Checked:
                column = item.text()
                combo = self.op_list.itemWidget(item)
                operation = combo.currentText()
                
                if operation == 'Union':
                    operations[column] = lambda x: list(set(x))
                elif operation == 'Join':
                    operations[column] = lambda x: '; '.join(map(str, x))
                elif operation == 'Total':
                    operations[column] = 'sum'
                    
        return operations 