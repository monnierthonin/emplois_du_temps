class Infirmier:
    """
    Classe représentant un infirmier/une infirmière
    """
    def __init__(self, id=None, nom=None, prenom=None, status=None, present=True):
        self.id = id
        self.nom = nom
        self.prenom = prenom
        self.status = status  # J, J1, J1*, J3
        self.present = present
    
    def to_dict(self):
        """
        Convertit l'objet en dictionnaire
        """
        return {
            'id': self.id,
            'nom': self.nom,
            'prenom': self.prenom,
            'status': self.status,
            'present': self.present
        }
    
    @classmethod
    def from_dict(cls, data):
        """
        Crée une instance à partir d'un dictionnaire
        """
        return cls(
            id=data.get('id'),
            nom=data.get('nom'),
            prenom=data.get('prenom'),
            status=data.get('status'),
            present=data.get('present', True)
        )
