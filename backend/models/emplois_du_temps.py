class EmploisDuTemps:
    """
    Classe représentant un planning d'emploi du temps pour une date spécifique
    """
    def __init__(self, id=None, date=None, salle16=None, salle17=None, salle18=None,
                 salle19=None, salle20=None, salle21=None, salle22=None, salle23=None, 
                 salle24=None, reveil1=None, reveil2=None, perinduction=None):
        self.id = id
        self.date = date
        self.salle16 = salle16
        self.salle17 = salle17
        self.salle18 = salle18
        self.salle19 = salle19
        self.salle20 = salle20
        self.salle21 = salle21
        self.salle22 = salle22
        self.salle23 = salle23
        self.salle24 = salle24
        self.reveil1 = reveil1
        self.reveil2 = reveil2
        self.perinduction = perinduction
    
    def to_dict(self):
        """
        Convertit l'objet en dictionnaire
        """
        return {
            'id': self.id,
            'date': self.date,
            'salle16': self.salle16,
            'salle17': self.salle17,
            'salle18': self.salle18,
            'salle19': self.salle19,
            'salle20': self.salle20,
            'salle21': self.salle21,
            'salle22': self.salle22,
            'salle23': self.salle23,
            'salle24': self.salle24,
            'reveil1': self.reveil1,
            'reveil2': self.reveil2,
            'perinduction': self.perinduction
        }
    
    @classmethod
    def from_dict(cls, data):
        """
        Crée une instance à partir d'un dictionnaire
        """
        return cls(
            id=data.get('id'),
            date=data.get('date'),
            salle16=data.get('salle16'),
            salle17=data.get('salle17'),
            salle18=data.get('salle18'),
            salle19=data.get('salle19'),
            salle20=data.get('salle20'),
            salle21=data.get('salle21'),
            salle22=data.get('salle22'),
            salle23=data.get('salle23'),
            salle24=data.get('salle24'),
            reveil1=data.get('reveil1'),
            reveil2=data.get('reveil2'),
            perinduction=data.get('perinduction')
        )
