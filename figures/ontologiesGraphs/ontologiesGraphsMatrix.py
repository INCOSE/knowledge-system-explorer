import matplotlib.pyplot as plt
import matplotlib.patches as patches

def generate_matrix_slide(highlight_quadrant=None, output_filename="matrix_slide.png"):
    """
    Генерирует слайд с 2x2 матрицей архитектур.
    highlight_quadrant: int (1-4) для подсветки конкретного квадранта, или None для стартового.
    1: BFO + LPG (Bottom-Left)
    2: BFO + RDF (Top-Left)
    3: ISO 15926 + LPG (Bottom-Right)
    4: ISO 15926 + RDF (Top-Right)
    """
    fig, ax = plt.subplots(figsize=(12, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')  # Отключаем стандартные оси координат
    
    # Цветовая схема
    color_bg = "#f8f9fa"
    color_highlight = "#d0ebff" # Светло-синий для активного квадранта
    color_line = "#343a40"
    
    fig.patch.set_facecolor('#ffffff')
    
    # Определение координат и свойств квадрантов
    # Квадранты: [x, y, width, height, label, title]
    quadrants = {
        2: [1, 5, 4, 4, "Quadrant 2", "3D BFO\n+\nW3C RDF"],
        4: [5, 5, 4, 4, "Quadrant 4", "4D ISO 15926\n+\nW3C RDF"],
        1: [1, 1, 4, 4, "Quadrant 1", "3D BFO\n+\nLPG"],
        3: [5, 1, 4, 4, "Quadrant 3", "4D ISO 15926\n+\nLPG"]
    }
    
    # Рисуем квадранты
    for q_num, (x, y, w, h, label, title) in quadrants.items():
        facecolor = color_highlight if q_num == highlight_quadrant else color_bg
        rect = patches.Rectangle((x, y), w, h, linewidth=2, edgecolor=color_line, 
                                 facecolor=facecolor, zorder=1)
        ax.add_patch(rect)
        
        # Текст внутри квадранта
        weight = 'bold' if q_num == highlight_quadrant else 'normal'
        ax.text(x + w/2, y + h/2 + 0.5, title, ha='center', va='center', 
                fontsize=16, weight=weight, color="#212529", zorder=2)
        ax.text(x + 0.2, y + h - 0.4, label, ha='left', va='center', 
                fontsize=12, weight='bold', color="#868e96", zorder=2)
                
    # Подписи осей
    # Горизонтальная ось (SMIM Layer)
    ax.text(5, 0.2, "Top-Level Ontological Commitment (SMIM layer)", 
            ha='center', va='center', fontsize=16, weight='bold', style='italic')
    ax.text(3, 0.7, "3D (BFO)", ha='center', va='center', fontsize=14, color="#495057")
    ax.text(7, 0.7, "4D (ISO 15926)", ha='center', va='center', fontsize=14, color="#495057")
    
    # Вертикальная ось (SMS Layer)
    ax.text(0.3, 5, "Physical Graph Storage (SMS layer)", 
            ha='center', va='center', fontsize=16, weight='bold', style='italic', rotation=90)
    ax.text(0.8, 3, "LPG", ha='center', va='center', fontsize=14, rotation=90, color="#495057")
    ax.text(0.8, 7, "W3C RDF", ha='center', va='center', fontsize=14, rotation=90, color="#495057")
    
    # Заголовок
    if highlight_quadrant is None:
        main_title = "The Architectural Matrix"
    else:
        main_title = f"Entering Quadrant {highlight_quadrant}"
    
    plt.title(main_title, fontsize=22, weight='bold', pad=20)
    
    # Сохранение
    plt.tight_layout()
    plt.savefig(output_filename, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Слайд сохранен: {output_filename}")

# Генерация всех необходимых состояний:
if __name__ == "__main__":
    generate_matrix_slide(highlight_quadrant=None, output_filename="00_matrix_base.png")
    generate_matrix_slide(highlight_quadrant=1, output_filename="01_matrix_q1.png")
    generate_matrix_slide(highlight_quadrant=2, output_filename="02_matrix_q2.png")
    generate_matrix_slide(highlight_quadrant=3, output_filename="03_matrix_q3.png")
    generate_matrix_slide(highlight_quadrant=4, output_filename="04_matrix_q4.png")