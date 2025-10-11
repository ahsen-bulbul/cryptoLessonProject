from abc import ABC, abstractmethod

class Cipher(ABC):
    @abstractmethod
    def encrypt(self, text: str, key: str) -> str:
        pass

    @abstractmethod
    def decrypt(self, text: str, key: str) -> str:
        pass
