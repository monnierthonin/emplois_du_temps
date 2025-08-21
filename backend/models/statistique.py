class Statistique:
    """
    Classe représentant les statistiques d'affectation d'un infirmier
    """
    def __init__(self, id=None, infirmierID=None, salle16=0, salle17=0, salle18=0, 
                 salle19=0, salle20=0, salle21=0, salle22=0, salle23=0, salle24=0, 
                 reveil1=0, reveil2=0, perinduction=0):
        self.id = id
        self.infirmierID = infirmierID
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
            'infirmierID': self.infirmierID,
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
            infirmierID=data.get('infirmierID'),
            salle16=data.get('salle16', 0),
            salle17=data.get('salle17', 0),
            salle18=data.get('salle18', 0),
            salle19=data.get('salle19', 0),
            salle20=data.get('salle20', 0),
            salle21=data.get('salle21', 0),
            salle22=data.get('salle22', 0),
            salle23=data.get('salle23', 0),
            salle24=data.get('salle24', 0),
            reveil1=data.get('reveil1', 0),
            reveil2=data.get('reveil2', 0),
            perinduction=data.get('perinduction', 0)
        )
